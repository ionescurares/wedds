-- 002_invitations.sql
-- Adds invitations table and links rsvp_responses to invitations

create table if not exists public.invitations (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references public.sites(id) on delete cascade,
  code text not null,
  guest_names text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'responded')),
  viewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (site_id, code)
);

create index if not exists idx_invitations_site_id on public.invitations(site_id);
create index if not exists idx_invitations_code on public.invitations(site_id, code);

alter table public.rsvp_responses
  add column if not exists invitation_id uuid references public.invitations(id) on delete set null;

create index if not exists idx_rsvp_invitation_id on public.rsvp_responses(invitation_id);

-- When an RSVP is inserted/updated with an invitation_id, mark the invitation as 'responded'
create or replace function public.update_invitation_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invitation_id is not null then
    update public.invitations
    set status = 'responded'
    where id = new.invitation_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_rsvp_update_invitation_status on public.rsvp_responses;
create trigger trg_rsvp_update_invitation_status
after insert or update on public.rsvp_responses
for each row
execute function public.update_invitation_status();

-- RLS for invitations
alter table public.invitations enable row level security;

create policy "Owners can read invitations"
on public.invitations
for select
to authenticated
using (
  site_id in (select id from public.sites where user_id = auth.uid())
);

create policy "Owners can insert invitations"
on public.invitations
for insert
to authenticated
with check (
  site_id in (select id from public.sites where user_id = auth.uid())
);

create policy "Owners can update invitations"
on public.invitations
for update
to authenticated
using (
  site_id in (select id from public.sites where user_id = auth.uid())
)
with check (
  site_id in (select id from public.sites where user_id = auth.uid())
);

create policy "Owners can delete invitations"
on public.invitations
for delete
to authenticated
using (
  site_id in (select id from public.sites where user_id = auth.uid())
);

-- Public can read invitations (needed for the public invite page and view tracking via service role)
create policy "Public can read published site invitations"
on public.invitations
for select
to anon
using (
  site_id in (select id from public.sites where status = 'published')
);
