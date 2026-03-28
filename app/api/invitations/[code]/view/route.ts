import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: { code: string } };

export async function POST(request: Request, { params }: RouteContext) {
  let body: { site_id?: string };
  try {
    body = (await request.json()) as { site_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const siteId = body.site_id?.trim();
  if (!siteId) {
    return NextResponse.json({ error: "site_id is required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: invitation } = await admin
    .from("invitations")
    .select("id, viewed_at")
    .eq("site_id", siteId)
    .eq("code", params.code)
    .maybeSingle();

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (!invitation.viewed_at) {
    await admin
      .from("invitations")
      .update({ viewed_at: new Date().toISOString() })
      .eq("id", invitation.id);
  }

  return NextResponse.json({ success: true });
}
