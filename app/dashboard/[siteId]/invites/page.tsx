import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import InviteManager from "@/components/dashboard/InviteManager";
import type { Site } from "@/types/database";
import "../../dashboard.css";

export const dynamic = "force-dynamic";

type PageProps = { params: { siteId: string } };

export default async function InvitesPage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/?login=true");

  const admin = getSupabaseAdmin();

  const { data: site } = await admin
    .from("sites")
    .select("id, slug, status, partner1_name, partner2_name, event_date, state")
    .eq("id", params.siteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!site) notFound();

  const { data: invitations } = await admin
    .from("invitations")
    .select("*")
    .eq("site_id", params.siteId)
    .order("created_at", { ascending: false });

  const invitationIds = (invitations ?? []).map((inv) => inv.id);
  const rsvpMap: Record<string, unknown> = {};
  if (invitationIds.length > 0) {
    const { data: rsvps } = await admin
      .from("rsvp_responses")
      .select("*")
      .in("invitation_id", invitationIds);

    for (const r of rsvps ?? []) {
      rsvpMap[r.invitation_id as string] = r;
    }
  }

  const invitationsWithRsvp = (invitations ?? []).map((inv) => ({
    ...inv,
    rsvp_response: rsvpMap[inv.id] ?? null,
  }));

  return (
    <main className="dashboard-page">
      <div className="dashboard-header">
        <InviteManager
          site={site as unknown as Site}
          initialInvitations={invitationsWithRsvp}
        />
      </div>
    </main>
  );
}
