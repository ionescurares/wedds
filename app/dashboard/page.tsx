import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardClient, { type DashboardSite } from "@/components/dashboard/DashboardClient";
import { createClient } from "@/lib/supabase/server";
import "./dashboard.css";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?login=true");
  }

  const { data } = await supabase
    .from("sites")
    .select("id, slug, status, updated_at, published_at, state, partner1_name, partner2_name, event_date, rsvp_yes_count, rsvp_no_count, rsvp_total_guests")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const sites = (data ?? []) as DashboardSite[];

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header-top">
          <Link href="/" className="dashboard-brand">
            Spunem Da
          </Link>
          <h1 className="dashboard-title">My Wedding Sites</h1>
        </div>
        <DashboardClient initialSites={sites} userEmail={user.email ?? ""} />
      </header>
    </main>
  );
}
