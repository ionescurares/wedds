import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTemplateComponent } from "@/lib/templates";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isReservedSlug } from "@/lib/reserved-slugs";
import type { SiteState } from "@/types/database";

type PageProps = {
  params: {
    slug: string;
  };
};

const DEFAULT_METADATA: Metadata = {
  title: "Wedding Invitation",
  description: "A beautiful wedding invitation.",
};

async function getPublishedSiteBySlug(slug: string) {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("sites")
    .select("id,state,template_id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  return data;
}

export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = params.slug.trim().toLowerCase();
  if (!slug || isReservedSlug(slug)) {
    return DEFAULT_METADATA;
  }

  const site = await getPublishedSiteBySlug(slug);
  const state = site?.state as SiteState | undefined;
  const partner1 = state?.meta?.partner1?.trim();
  const partner2 = state?.meta?.partner2?.trim();
  const date = state?.meta?.date?.trim();

  if (!partner1 || !partner2 || !date) {
    return DEFAULT_METADATA;
  }

  const title = `${partner1} & ${partner2} - Wedding Invitation`;
  const description = `You are invited to celebrate the wedding of ${partner1} and ${partner2} on ${date}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function PublicSitePage({ params }: PageProps) {
  const slug = params.slug.trim().toLowerCase();
  if (!slug || isReservedSlug(slug)) {
    notFound();
  }

  const site = await getPublishedSiteBySlug(slug);
  if (!site?.state) {
    notFound();
  }

  const state = site.state as SiteState;
  const admin = getSupabaseAdmin();
  const { data: template } = await admin
    .from("templates")
    .select("slug")
    .eq("id", (site as { template_id?: string | null }).template_id ?? "")
    .maybeSingle();
  const templateSlug = template?.slug ?? state.templateId ?? "elegant-editorial";
  const TemplateComponent = getTemplateComponent(templateSlug);
  return <TemplateComponent state={state} editable={false} siteId={site.id} />;
}
