import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import GuestManager from "@/components/dashboard/GuestManager";
import type { RsvpResponse, Site } from "@/types/database";

export const dynamic = "force-dynamic";

type PageProps = { params: { siteId: string } };

export default async function GuestsPage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/?login=true");

  const admin = getSupabaseAdmin();

  const { data: site } = await admin
    .from("sites")
    .select("id, slug, status, partner1_name, partner2_name, event_date, state, rsvp_yes_count, rsvp_no_count, rsvp_total_guests")
    .eq("id", params.siteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!site) notFound();

  const { data: responses } = await admin
    .from("rsvp_responses")
    .select("*")
    .eq("site_id", params.siteId)
    .order("submitted_at", { ascending: false });

  return (
    <GuestManager
      site={site as unknown as Site}
      initialResponses={(responses ?? []) as unknown as RsvpResponse[]}
    />
  );
}
