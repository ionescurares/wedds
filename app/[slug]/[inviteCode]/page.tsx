import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTemplateComponent } from "@/lib/templates";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isReservedSlug } from "@/lib/reserved-slugs";
import type { SiteState } from "@/types/database";
import InviteViewTracker from "./InviteViewTracker";

type PageProps = {
  params: {
    slug: string;
    inviteCode: string;
  };
};

async function getSiteAndInvitation(slug: string, code: string) {
  const admin = getSupabaseAdmin();

  const { data: site } = await admin
    .from("sites")
    .select("id, state, template_id, partner1_name, partner2_name")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!site) return null;

  const { data: invitation } = await admin
    .from("invitations")
    .select("id, guest_names")
    .eq("site_id", site.id)
    .eq("code", code)
    .maybeSingle();

  if (!invitation) return null;

  return { site, invitation };
}

export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = params.slug.trim().toLowerCase();
  if (!slug || isReservedSlug(slug)) {
    return { title: "Wedding Invitation" };
  }

  const result = await getSiteAndInvitation(slug, params.inviteCode);
  if (!result) return { title: "Wedding Invitation" };

  const state = result.site.state as SiteState | undefined;
  const partner1 = result.site.partner1_name ?? state?.meta?.partner1 ?? "";
  const partner2 = result.site.partner2_name ?? state?.meta?.partner2 ?? "";

  if (!partner1 || !partner2) return { title: "Wedding Invitation" };

  const title = `You're Invited - ${partner1} & ${partner2} Wedding`;
  const description = `A personal invitation to celebrate the wedding of ${partner1} and ${partner2}`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

export default async function InviteCodePage({ params }: PageProps) {
  const slug = params.slug.trim().toLowerCase();
  if (!slug || isReservedSlug(slug)) notFound();

  const result = await getSiteAndInvitation(slug, params.inviteCode);
  if (!result) notFound();

  const { site, invitation } = result;
  const state = site.state as SiteState;

  const admin = getSupabaseAdmin();
  const { data: template } = await admin
    .from("templates")
    .select("slug")
    .eq("id", (site as { template_id?: string | null }).template_id ?? "")
    .maybeSingle();

  const templateSlug = template?.slug ?? state.templateId ?? "elegant-editorial";
  const TemplateComponent = getTemplateComponent(templateSlug);

  return (
    <>
      <InviteViewTracker siteId={site.id} code={params.inviteCode} />
      <TemplateComponent
        state={state}
        editable={false}
        siteId={site.id}
        invitation={{ id: invitation.id, guestNames: invitation.guest_names as string[] }}
      />
    </>
  );
}
