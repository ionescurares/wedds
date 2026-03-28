import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateInviteCode } from "@/lib/utils/generate-code";

type RouteContext = { params: { siteId: string } };

async function getAuthUserId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function verifySiteOwnership(siteId: string, userId: string) {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("sites")
    .select("id")
    .eq("id", siteId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await verifySiteOwnership(params.siteId, userId))) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const admin = getSupabaseAdmin();

  const { data: invitations, error } = await admin
    .from("invitations")
    .select("*")
    .eq("site_id", params.siteId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 });
  }

  const invitationIds = (invitations ?? []).map((inv) => inv.id);

  let rsvpMap: Record<string, unknown> = {};
  if (invitationIds.length > 0) {
    const { data: rsvps } = await admin
      .from("rsvp_responses")
      .select("*")
      .in("invitation_id", invitationIds);

    for (const r of rsvps ?? []) {
      rsvpMap[r.invitation_id as string] = r;
    }
  }

  const result = (invitations ?? []).map((inv) => ({
    ...inv,
    rsvp_response: rsvpMap[inv.id] ?? null,
  }));

  return NextResponse.json({ invitations: result });
}

export async function POST(request: Request, { params }: RouteContext) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await verifySiteOwnership(params.siteId, userId))) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  let body: { guest_names?: string[] };
  try {
    body = (await request.json()) as { guest_names?: string[] };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const guestNames = (body.guest_names ?? [])
    .map((n) => (typeof n === "string" ? n.trim() : ""))
    .filter(Boolean);

  if (guestNames.length === 0) {
    return NextResponse.json({ error: "At least one guest name is required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  let code = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const candidate = generateInviteCode();
    const { data: existing } = await admin
      .from("invitations")
      .select("id")
      .eq("site_id", params.siteId)
      .eq("code", candidate)
      .maybeSingle();

    if (!existing) {
      code = candidate;
      break;
    }
  }

  if (!code) {
    return NextResponse.json({ error: "Failed to generate unique code" }, { status: 500 });
  }

  const { data: invitation, error } = await admin
    .from("invitations")
    .insert({
      site_id: params.siteId,
      code,
      guest_names: guestNames,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !invitation) {
    return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
  }

  return NextResponse.json({ invitation });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await verifySiteOwnership(params.siteId, userId))) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  let invitationId = url.searchParams.get("invitation_id");

  if (!invitationId) {
    try {
      const body = (await request.json()) as { invitation_id?: string };
      invitationId = body.invitation_id ?? null;
    } catch {
      /* id from query param */
    }
  }

  if (!invitationId) {
    return NextResponse.json({ error: "invitation_id is required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("invitations")
    .delete()
    .eq("id", invitationId)
    .eq("site_id", params.siteId);

  if (error) {
    return NextResponse.json({ error: "Failed to delete invitation" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
