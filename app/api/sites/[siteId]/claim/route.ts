import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: { siteId: string } };

export async function POST(_request: Request, { params }: RouteContext) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { siteId } = params;
  const admin = getSupabaseAdmin();

  const { data: site, error: fetchError } = await admin
    .from("sites")
    .select("id, user_id")
    .eq("id", siteId)
    .single();

  if (fetchError || !site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  if (site.user_id) {
    if (site.user_id === user.id) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Site already claimed" }, { status: 409 });
  }

  const { error: updateError } = await admin
    .from("sites")
    .update({
      user_id: user.id,
      expires_at: null,
    })
    .eq("id", siteId);

  if (updateError) {
    return NextResponse.json({ error: "Failed to claim site" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
