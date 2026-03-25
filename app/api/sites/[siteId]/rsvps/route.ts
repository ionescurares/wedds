import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: { siteId: string } };

export async function GET(request: Request, { params }: RouteContext) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: site } = await admin
    .from("sites")
    .select("id")
    .eq("id", params.siteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const attendingFilter = url.searchParams.get("attending");
  const search = url.searchParams.get("search")?.trim();

  let query = admin
    .from("rsvp_responses")
    .select("*")
    .eq("site_id", params.siteId)
    .order("submitted_at", { ascending: false });

  if (attendingFilter === "yes" || attendingFilter === "no") {
    query = query.eq("attending", attendingFilter);
  }
  if (search) {
    query = query.or(`guest_name.ilike.%${search}%,guest_email.ilike.%${search}%`);
  }

  const { data: responses, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch RSVPs" }, { status: 500 });
  }

  const all = responses ?? [];
  const attending = all.filter((r) => r.attending === "yes");
  const declining = all.filter((r) => r.attending === "no");
  const totalGuests = attending.reduce((sum: number, r) => sum + (r.guest_count ?? 1), 0);

  return NextResponse.json({
    responses: all,
    stats: {
      totalResponses: all.length,
      attending: attending.length,
      declining: declining.length,
      totalGuests,
    },
  });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: site } = await admin
    .from("sites")
    .select("id")
    .eq("id", params.siteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  let rsvpId: string | null = null;

  const url = new URL(request.url);
  rsvpId = url.searchParams.get("rsvpId");

  if (!rsvpId) {
    try {
      const body = (await request.json()) as { rsvp_id?: string };
      rsvpId = body.rsvp_id ?? null;
    } catch {
      /* empty body, id from query param */
    }
  }

  if (!rsvpId) {
    return NextResponse.json({ error: "rsvp_id is required" }, { status: 400 });
  }

  const { error } = await admin
    .from("rsvp_responses")
    .delete()
    .eq("id", rsvpId)
    .eq("site_id", params.siteId);

  if (error) {
    return NextResponse.json({ error: "Failed to delete RSVP" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
