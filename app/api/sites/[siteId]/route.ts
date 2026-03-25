import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isReservedSlug } from "@/lib/reserved-slugs";

type RouteContext = { params: { siteId: string } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
const IMAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_SITE_IMAGES_BUCKET ?? "site-images";

function isValidSlug(slug: string): boolean {
  if (UUID_RE.test(slug)) return true;
  return slug.length >= 3 && SLUG_RE.test(slug);
}

async function getAuthUserId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const siteId = params.siteId;

  const { data: current, error: fetchError } = await admin
    .from("sites")
    .select("id, slug, status, user_id")
    .eq("id", siteId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  let body: {
    slug?: string;
    status?: "draft" | "published";
    partner1_name?: string | null;
    partner2_name?: string | null;
    event_date?: string | null;
  };
  try {
    body = (await request.json()) as { slug?: string; status?: "draft" | "published" };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  const oldSlug = current.slug ?? "";

  if (typeof body.slug === "string") {
    const nextSlug = body.slug.trim().toLowerCase();
    if (!isValidSlug(nextSlug)) {
      return NextResponse.json({ error: "Invalid slug format" }, { status: 422 });
    }
    if (isReservedSlug(nextSlug)) {
      return NextResponse.json({ error: "This slug is reserved" }, { status: 422 });
    }

    if (nextSlug !== oldSlug) {
      const { data: existing } = await admin
        .from("sites")
        .select("id")
        .eq("slug", nextSlug)
        .neq("id", siteId)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
      }
    }

    updates.slug = nextSlug;
  }

  if (body.status === "draft" && current.status === "published") {
    updates.status = "draft";
    updates.published_at = null;
  }

  if ("partner1_name" in body) {
    updates.partner1_name = body.partner1_name?.trim() || null;
  }
  if ("partner2_name" in body) {
    updates.partner2_name = body.partner2_name?.trim() || null;
  }
  if ("event_date" in body) {
    updates.event_date = body.event_date?.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    const { data: unchanged } = await admin
      .from("sites")
      .select("id, slug, status, updated_at, published_at, state, partner1_name, partner2_name, event_date")
      .eq("id", siteId)
      .single();
    return NextResponse.json({ site: unchanged });
  }

  const { data: updated, error: updateError } = await admin
    .from("sites")
    .update(updates)
    .eq("id", siteId)
    .eq("user_id", userId)
    .select("id, slug, status, updated_at, published_at, state, partner1_name, partner2_name, event_date")
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Failed to update site" }, { status: 500 });
  }

  if (current.status === "published" && oldSlug) {
    revalidatePath(`/${oldSlug}`);
  }
  if (updated.status === "published" && updated.slug) {
    revalidatePath(`/${updated.slug}`);
  }

  return NextResponse.json({ site: updated });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const siteId = params.siteId;

  const { data: site, error: siteError } = await admin
    .from("sites")
    .select("id, slug, status, user_id")
    .eq("id", siteId)
    .eq("user_id", userId)
    .single();

  if (siteError || !site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const { data: images } = await admin
    .from("site_images")
    .select("storage_path")
    .eq("site_id", siteId);

  const paths = (images ?? []).map((img) => img.storage_path).filter(Boolean);
  if (paths.length > 0) {
    await admin.storage.from(IMAGE_BUCKET).remove(paths);
  }

  const { error: deleteError } = await admin
    .from("sites")
    .delete()
    .eq("id", siteId)
    .eq("user_id", userId);

  if (deleteError) {
    return NextResponse.json({ error: "Failed to delete site" }, { status: 500 });
  }

  if (site.status === "published" && site.slug) {
    revalidatePath(`/${site.slug}`);
  }

  return NextResponse.json({ success: true });
}
