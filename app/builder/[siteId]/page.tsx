import { redirect } from "next/navigation";
import BuilderClient from "@/components/builder/BuilderClient";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { SiteState } from "@/types/database";
import "./builder.css";

type PageProps = {
  params: {
    siteId: string;
  };
  searchParams: {
    template?: string;
  };
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default async function BuilderPage({ params, searchParams }: PageProps) {
  const { siteId } = params;
  const admin = createAdminClient();

  if (siteId === "new") {
    const requestedSlug =
      (typeof searchParams.template === "string" && searchParams.template.trim()) || "elegant-editorial";

    let { data: template } = await admin
      .from("templates")
      .select("id,slug,base_state")
      .eq("slug", requestedSlug.trim().toLowerCase())
      .single();

    if (!template?.id || !template?.base_state) {
      const fallback = await admin
        .from("templates")
        .select("id,slug,base_state")
        .eq("slug", "elegant-editorial")
        .single();
      template = fallback.data ?? null;
    }

    if (!template?.id || !template?.base_state) {
      redirect("/");
    }

    return (
      <BuilderClient
        initialState={template.base_state as SiteState}
        templateDefaults={template.base_state as SiteState}
        siteId={null}
        templateId={template.id}
        initialStatus="draft"
        initialSlug={null}
        initialPartner1Name={null}
        initialPartner2Name={null}
        initialEventDate={null}
        templateSlug={template.slug}
      />
    );
  }

  if (!isUuid(siteId)) {
    redirect("/");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const siteQuery = admin
    .from("sites")
    .select("id,template_id,state,user_id,status,slug,partner1_name,partner2_name,event_date")
    .eq("id", siteId);

  const { data: site } = await siteQuery.single();

  if (!site?.id || !site?.state || !site?.template_id) {
    redirect("/");
  }

  if (site.user_id && site.user_id !== user?.id) {
    redirect("/dashboard");
  }

  const { data: template } = await admin
    .from("templates")
    .select("slug,base_state")
    .eq("id", site.template_id)
    .single();

  const templateDefaults = (template?.base_state as SiteState | null) ?? (site.state as SiteState);

  return (
    <BuilderClient
      initialState={site.state as SiteState}
      templateDefaults={templateDefaults}
      siteId={site.id}
      templateId={site.template_id}
      initialStatus={site.status === "published" ? "published" : "draft"}
      initialSlug={site.slug ?? null}
      initialPartner1Name={site.partner1_name ?? null}
      initialPartner2Name={site.partner2_name ?? null}
      initialEventDate={site.event_date ?? null}
      templateSlug={template?.slug ?? "elegant-editorial"}
    />
  );
}
