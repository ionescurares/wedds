import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isReservedSlug } from "@/lib/reserved-slugs";

type RouteContext = { params: { siteId: string } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

function isValidSlug(slug: string): boolean {
  if (UUID_RE.test(slug)) return true;
  return slug.length >= 3 && SLUG_RE.test(slug);
}

export async function POST(request: Request, { params }: RouteContext) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { siteId } = params;

  let slug: string | undefined;
  let partner1Name: string | null = null;
  let partner2Name: string | null = null;
  let eventDate: string | null = null;
  try {
    const body = (await request.json()) as {
      slug?: string;
      partner1_name?: string | null;
      partner2_name?: string | null;
      event_date?: string | null;
    };
    slug = body.slug;
    partner1Name = body.partner1_name?.trim() || null;
    partner2Name = body.partner2_name?.trim() || null;
    eventDate = body.event_date?.trim() || null;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!slug) {
    slug = siteId;
  }

  if (!isValidSlug(slug)) {
    return NextResponse.json(
      { error: "Invalid slug. Use 3+ lowercase letters, numbers, and hyphens." },
      { status: 422 }
    );
  }

  if (isReservedSlug(slug)) {
    return NextResponse.json({ error: "This slug is reserved." }, { status: 422 });
  }

  const admin = createAdminClient();

  const { data: site, error: fetchError } = await admin
    .from("sites")
    .select("id, user_id")
    .eq("id", siteId)
    .single();

  if (fetchError || !site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  if (site.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing } = await admin
    .from("sites")
    .select("id")
    .eq("slug", slug)
    .neq("id", siteId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
  }

  const { error: updateError } = await admin
    .from("sites")
    .update({
      slug,
      status: "published",
      published_at: new Date().toISOString(),
      partner1_name: partner1Name,
      partner2_name: partner2Name,
      event_date: eventDate,
    })
    .eq("id", siteId);

  if (updateError) {
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  }

  revalidatePath(`/${slug}`);

  return NextResponse.json({ success: true, url: `/${slug}` });
}
