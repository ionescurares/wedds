export type SiteState = {
  templateId: string;
  version: number;
  meta: {
    partner1: string;
    partner2: string;
    date: string;
    slug: string;
  };
  elements: Record<
    string,
    {
      text: string;
      styles: Record<string, string>;
    }
  >;
  images: Record<
    string,
    {
      src: string;
      alt: string;
    }
  >;
};

export type SiteStatus = "draft" | "published";

export type Site = {
  id: string;
  user_id: string | null;
  template_id: string;
  slug: string | null;
  partner1_name: string | null;
  partner2_name: string | null;
  event_date: string | null;
  state: SiteState;
  status: SiteStatus;
  expires_at: string | null;
  published_at: string | null;
  updated_at: string;
  created_at: string;
};

export type Template = {
  id: string;
  slug: string;
  name: string;
  description: string;
  thumbnail_url: string;
  base_state: SiteState;
  is_active: boolean;
  created_at: string;
};

export type ProfilePlan = "free" | "paid";

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  plan: ProfilePlan;
  created_at: string;
  updated_at: string;
};

export type SiteImage = {
  id: string;
  site_id: string;
  storage_path: string;
  original_name: string;
  size_bytes: number;
  created_at: string;
};
