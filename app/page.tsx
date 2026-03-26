import LandingPageClient from "@/components/home/LandingPageClient";
import { createAdminClient } from "@/lib/supabase/server";

const DEFAULT_TEMPLATES = [
  {
    slug: "elegant-editorial",
    name: "Elegant Editorial",
    description: "A refined, editorial layout with serif typography and generous whitespace.",
  },
  {
    slug: "romantic-floral",
    name: "Romantic Floral",
    description:
      "Garden-romantic editorial spread. Split-screen hero, asymmetric photo layout, botanical greens and warm mauves.",
  },
];

export default async function Home() {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("templates")
    .select("slug,name,description")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const dbTemplates = (data ?? []).map((t) => ({
    slug: String(t.slug ?? ""),
    name: String(t.name ?? "Template"),
    description: String(t.description ?? ""),
  }));

  const templateBySlug = new Map<string, (typeof dbTemplates)[number]>();
  for (const template of [...DEFAULT_TEMPLATES, ...dbTemplates]) {
    if (!template.slug) continue;
    templateBySlug.set(template.slug, template);
  }

  const templates = Array.from(templateBySlug.values());

  return <LandingPageClient templates={templates} />;
}
