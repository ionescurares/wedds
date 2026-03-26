-- Local development seed data
-- This file runs after migrations on `supabase db reset`.

-- Ensure local storage bucket exists
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', false)
on conflict (id) do nothing;

-- Ensure template exists (idempotent)
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
      "partner1": "Alex",
      "partner2": "Luca",
      "date": "September 14, 2026",
      "slug": "alex-si-luca-2026"
    },
    "elements": {
      "nav-monogram": { "text": "A &amp; L", "styles": {} },
      "hero-names": { "text": "Alex &amp; Luca", "styles": {} },
      "hero-date": { "text": "September 14, 2026", "styles": {} },
      "footer-names": { "text": "Alex &amp; Luca", "styles": {} },
      "footer-date": { "text": "14 . 09 . 2026", "styles": {} }
    },
    "images": {},
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

-- NOTE:
-- Create a local test user via Supabase Studio Auth UI (http://127.0.0.1:54323)
-- or by signing up in the app. Then set user_id below if you want an owner-bound site.

insert into public.sites (
  id,
  user_id,
  template_id,
  slug,
  partner1_name,
  partner2_name,
  event_date,
  state,
  status,
  published_at
)
values (
  '22222222-2222-4222-8222-222222222222',
  null,
  '11111111-1111-4111-8111-111111111111',
  'demo-wedding-site',
  'Alex',
  'Luca',
  '2026-09-14',
  $$
  {
    "templateId": "11111111-1111-4111-8111-111111111111",
    "version": 1,
    "meta": {
      "partner1": "Alex",
      "partner2": "Luca",
      "date": "September 14, 2026",
      "slug": "demo-wedding-site"
    },
    "elements": {
      "hero-names": { "text": "Alex &amp; Luca", "styles": {} },
      "hero-date": { "text": "September 14, 2026", "styles": {} },
      "rsvp-title": { "text": "Will you join us?", "styles": {} }
    },
    "images": {},
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
  'published',
  now()
)
on conflict (id)
do update set
  slug = excluded.slug,
  partner1_name = excluded.partner1_name,
  partner2_name = excluded.partner2_name,
  event_date = excluded.event_date,
  state = excluded.state,
  status = excluded.status,
  published_at = excluded.published_at;

-- Ensure RSVP editable text keys exist on template base states
update public.templates
set base_state = jsonb_set(
  base_state,
  '{elements}',
  coalesce(base_state->'elements', '{}'::jsonb) || '{
    "rsvp-form-name-label": {"text": "Your Full Name", "styles": {}},
    "rsvp-form-email-label": {"text": "Email Address", "styles": {}},
    "rsvp-form-attending-label": {"text": "Will you be attending?", "styles": {}},
    "rsvp-form-guests-label": {"text": "Number of Additional Guests", "styles": {}},
    "rsvp-form-dietary-label": {"text": "Dietary Restrictions or Notes", "styles": {}},
    "rsvp-accept-text": {"text": "Joyfully Accept", "styles": {}},
    "rsvp-decline-text": {"text": "Regretfully Decline", "styles": {}},
    "rsvp-submit-text": {"text": "Send Response", "styles": {}},
    "rsvp-success-title": {"text": "Thank You", "styles": {}},
    "rsvp-success-message": {"text": "We are overjoyed that you will celebrate with us.", "styles": {}}
  }'::jsonb
)
where slug in ('romantic-floral', 'elegant-editorial');

insert into public.rsvp_responses (site_id, guest_name, guest_email, attending, guest_count, data, notes, submitted_at)
values
  ('22222222-2222-4222-8222-222222222222', 'Ana Ionescu', 'ana@example.com', 'yes', 2, '{"dietary":"Vegetarian"}'::jsonb, null, now() - interval '9 days'),
  ('22222222-2222-4222-8222-222222222222', 'Mihai Pop', 'mihai@example.com', 'yes', 1, '{"dietary":"No restrictions"}'::jsonb, null, now() - interval '8 days'),
  ('22222222-2222-4222-8222-222222222222', 'Ioana Radu', 'ioana@example.com', 'no', 0, '{"dietary":"Out of town"}'::jsonb, null, now() - interval '7 days'),
  ('22222222-2222-4222-8222-222222222222', 'Andrei Dumitru', 'andrei@example.com', 'yes', 3, '{"dietary":"Nut allergy"}'::jsonb, null, now() - interval '6 days'),
  ('22222222-2222-4222-8222-222222222222', 'Raluca Marin', 'raluca@example.com', 'yes', 1, '{"dietary":"Vegan"}'::jsonb, null, now() - interval '5 days'),
  ('22222222-2222-4222-8222-222222222222', 'George Pavel', 'george@example.com', 'no', 0, '{"dietary":""}'::jsonb, null, now() - interval '4 days'),
  ('22222222-2222-4222-8222-222222222222', 'Elena Stan', 'elena@example.com', 'yes', 2, '{"dietary":"Gluten-free"}'::jsonb, 'Will arrive late', now() - interval '3 days'),
  ('22222222-2222-4222-8222-222222222222', 'Victor Ene', 'victor@example.com', 'yes', 1, '{"dietary":"No onion"}'::jsonb, null, now() - interval '2 days')
on conflict do nothing;
