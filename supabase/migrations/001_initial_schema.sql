-- 001_initial_schema.sql
-- Consolidated initial schema (no pg_cron, no anonymous_token)

create extension if not exists "uuid-ossp";

create table if not exists public.templates (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  description text not null,
  thumbnail_url text,
  base_state jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null default '',
  plan text not null default 'free' check (plan in ('free', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  template_id uuid not null references public.templates(id) on delete restrict,
  slug text unique,
  partner1_name text,
  partner2_name text,
  event_date date,
  state jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  expires_at timestamptz,
  published_at timestamptz,
  rsvp_yes_count integer not null default 0,
  rsvp_no_count integer not null default 0,
  rsvp_total_guests integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_images (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references public.sites(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.rsvp_responses (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references public.sites(id) on delete cascade,
  guest_name text not null,
  guest_email text,
  attending text not null check (attending in ('yes', 'no')),
  guest_count integer not null default 1,
  data jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  notes text
);

create index if not exists idx_templates_is_active on public.templates(is_active);
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_sites_user_id on public.sites(user_id);
create index if not exists idx_sites_status on public.sites(status);
create index if not exists idx_sites_updated_at on public.sites(updated_at desc);
create index if not exists idx_site_images_site_id on public.site_images(site_id);
create index if not exists idx_rsvp_site_id on public.rsvp_responses(site_id);
create index if not exists idx_rsvp_attending on public.rsvp_responses(site_id, attending);
create index if not exists idx_rsvp_submitted_at on public.rsvp_responses(site_id, submitted_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_sites_set_updated_at on public.sites;
create trigger trg_sites_set_updated_at
before update on public.sites
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, ''), '@', 1), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.update_rsvp_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_site_id uuid;
begin
  target_site_id := case when tg_op = 'DELETE' then old.site_id else new.site_id end;

  update public.sites
  set
    rsvp_yes_count = (
      select count(*)
      from public.rsvp_responses
      where site_id = target_site_id and attending = 'yes'
    ),
    rsvp_no_count = (
      select count(*)
      from public.rsvp_responses
      where site_id = target_site_id and attending = 'no'
    ),
    rsvp_total_guests = (
      select coalesce(sum(guest_count), 0)
      from public.rsvp_responses
      where site_id = target_site_id and attending = 'yes'
    )
  where id = target_site_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists rsvp_count_trigger on public.rsvp_responses;
create trigger rsvp_count_trigger
after insert or update or delete on public.rsvp_responses
for each row
execute function public.update_rsvp_counts();

alter table public.templates enable row level security;
alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.site_images enable row level security;
alter table public.rsvp_responses enable row level security;

create policy "Public can read active templates"
on public.templates
for select
to anon, authenticated
using (is_active = true);

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Anon can create drafts"
on public.sites
for insert
to anon
with check (user_id is null and status = 'draft');

create policy "Authenticated can create own sites"
on public.sites
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Anon can read anonymous drafts"
on public.sites
for select
to anon
using (user_id is null);

create policy "Authenticated can read own sites"
on public.sites
for select
to authenticated
using (user_id = auth.uid());

create policy "Anon can update anonymous drafts"
on public.sites
for update
to anon
using (user_id is null)
with check (user_id is null);

create policy "Authenticated can update own sites"
on public.sites
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Authenticated can delete own sites"
on public.sites
for delete
to authenticated
using (user_id = auth.uid());

create policy "Owners can read site images"
on public.site_images
for select
to authenticated
using (
  exists (
    select 1
    from public.sites s
    where s.id = site_images.site_id
      and s.user_id = auth.uid()
  )
);

create policy "Owners can insert site images"
on public.site_images
for insert
to authenticated
with check (
  exists (
    select 1
    from public.sites s
    where s.id = site_images.site_id
      and s.user_id = auth.uid()
  )
);

create policy "Owners can update site images"
on public.site_images
for update
to authenticated
using (
  exists (
    select 1
    from public.sites s
    where s.id = site_images.site_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.sites s
    where s.id = site_images.site_id
      and s.user_id = auth.uid()
  )
);

create policy "Owners can delete site images"
on public.site_images
for delete
to authenticated
using (
  exists (
    select 1
    from public.sites s
    where s.id = site_images.site_id
      and s.user_id = auth.uid()
  )
);

create policy "Anyone can submit RSVP"
on public.rsvp_responses
for insert
to anon, authenticated
with check (
  site_id in (select id from public.sites where status = 'published')
);

create policy "Owners can read RSVPs"
on public.rsvp_responses
for select
to authenticated
using (
  site_id in (select id from public.sites where user_id = auth.uid())
);

create policy "Owners can update RSVPs"
on public.rsvp_responses
for update
to authenticated
using (
  site_id in (select id from public.sites where user_id = auth.uid())
)
with check (
  site_id in (select id from public.sites where user_id = auth.uid())
);

create policy "Owners can delete RSVPs"
on public.rsvp_responses
for delete
to authenticated
using (
  site_id in (select id from public.sites where user_id = auth.uid())
);

insert into public.templates (id, slug, name, description, thumbnail_url, base_state, is_active)
values (
  '11111111-1111-4111-8111-111111111111',
  'elegant-editorial',
  'Elegant Editorial',
  'A refined, editorial layout with serif typography and generous whitespace.',
  'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&q=80',
  $$
  {
    "templateId": "11111111-1111-4111-8111-111111111111",
    "version": 1,
    "meta": {
      "partner1": "Marco",
      "partner2": "Julian",
      "date": "September 14, 2026",
      "slug": "marco-si-julian-2026"
    },
    "elements": {
      "nav-monogram": { "text": "M &amp; J", "styles": {} },
      "nav-link-1": { "text": "Details", "styles": {} },
      "nav-link-2": { "text": "RSVP", "styles": {} },
      "hero-date": { "text": "September 14, 2026", "styles": {} },
      "hero-names": { "text": "Marco &amp; Julian", "styles": {} },
      "hero-sub": { "text": "Request the pleasure of your company", "styles": {} },
      "story-label": { "text": "Our Story", "styles": {} },
      "story-title": { "text": "Two paths, one journey", "styles": {} },
      "story-body": { "text": "What started as a chance meeting became the greatest adventure of our lives.", "styles": {} },
      "details-label": { "text": "The Celebration", "styles": {} },
      "details-title": { "text": "Where it all comes together", "styles": {} },
      "rsvp-label": { "text": "Respond", "styles": {} },
      "rsvp-title": { "text": "Will you join us?", "styles": {} },
      "rsvp-body": { "text": "We would be honored to have you celebrate with us. Please let us know by August 1, 2026.", "styles": {} },
      "footer-names": { "text": "Marco &amp; Julian", "styles": {} },
      "footer-date": { "text": "14 . 09 . 2026", "styles": {} }
    },
    "images": {
      "hero-1": { "src": "https://picsum.photos/seed/wedding1/800/1000", "alt": "Wedding couple portrait" },
      "hero-2": { "src": "https://picsum.photos/seed/wedding2/800/1000", "alt": "Wedding bouquet" },
      "hero-3": { "src": "https://picsum.photos/seed/wedding3/800/1000", "alt": "Wedding details" },
      "gallery-1": { "src": "https://picsum.photos/seed/couple1/800/600", "alt": "Story image 1" },
      "gallery-2": { "src": "https://picsum.photos/seed/couple2/800/600", "alt": "Story image 2" },
      "gallery-3": { "src": "https://picsum.photos/seed/couple3/800/600", "alt": "Story image 3" },
      "gallery-4": { "src": "https://picsum.photos/seed/couple4/800/600", "alt": "Story image 4" },
      "gallery-5": { "src": "https://picsum.photos/seed/couple5/1000/500", "alt": "Story image 5" }
    },
    "rsvpFields": [
      {
        "id": "dietary",
        "type": "textarea",
        "label": "Dietary Restrictions or Notes",
        "placeholder": "Anything we should know...",
        "required": false
      }
    ]
  }
  $$::jsonb,
  true
)
on conflict (slug)
do update set
  name = excluded.name,
  description = excluded.description,
  thumbnail_url = excluded.thumbnail_url,
  base_state = excluded.base_state,
  is_active = excluded.is_active;
