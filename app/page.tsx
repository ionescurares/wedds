import LandingPageClient, {
  type LandingTemplateRow,
} from "@/components/home/LandingPageClient";
import { createAdminClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("templates")
    .select("id, slug, name, description, thumbnail_url")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const templates = (data ?? []) as LandingTemplateRow[];

  return <LandingPageClient templates={templates} />;
}
