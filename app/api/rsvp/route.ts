import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RsvpBody = {
  site_id?: string;
  guest_name?: string;
  guest_email?: string;
  attending?: string;
  guest_count?: number;
  data?: Record<string, string>;
};

export async function POST(request: Request) {
  let body: RsvpBody;
  try {
    body = (await request.json()) as RsvpBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const siteId = body.site_id?.trim();
  const guestName = body.guest_name?.trim();
  const guestEmail = body.guest_email?.trim() || null;
  const attending = body.attending?.trim();
  const customData = body.data ?? {};

  if (!siteId) {
    return NextResponse.json({ error: "site_id is required" }, { status: 400 });
  }
  if (!guestName) {
    return NextResponse.json({ error: "guest_name is required" }, { status: 400 });
  }
  if (attending !== "yes" && attending !== "no") {
    return NextResponse.json({ error: "attending must be 'yes' or 'no'" }, { status: 400 });
  }

  const guestCount = attending === "no" ? 0 : Math.max(1, Math.floor(body.guest_count ?? 1));

  const admin = getSupabaseAdmin();

  const { data: site } = await admin
    .from("sites")
    .select("id")
    .eq("id", siteId)
    .eq("status", "published")
    .maybeSingle();

  if (!site) {
    return NextResponse.json({ error: "Published site not found" }, { status: 404 });
  }

  let duplicate = false;

  if (guestEmail) {
    const { data: existing } = await admin
      .from("rsvp_responses")
      .select("id")
      .eq("site_id", siteId)
      .eq("guest_email", guestEmail)
      .maybeSingle();

    if (existing) {
      duplicate = true;
      const { error: updateError } = await admin
        .from("rsvp_responses")
        .update({
          guest_name: guestName,
          attending,
          guest_count: guestCount,
          data: customData,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        return NextResponse.json({ error: "Failed to update RSVP" }, { status: 500 });
      }
    }
  }

  if (!duplicate) {
    const { error: insertError } = await admin.from("rsvp_responses").insert({
      site_id: siteId,
      guest_name: guestName,
      guest_email: guestEmail,
      attending,
      guest_count: guestCount,
      data: customData,
    });

    if (insertError) {
      return NextResponse.json({ error: "Failed to submit RSVP" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, duplicate });
}
