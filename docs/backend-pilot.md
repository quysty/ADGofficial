# Backend Pilot

This pilot connects the static site to Supabase without changing the production map logic.

## Goal

- Prove that the website can read public Supabase data.
- Prove that only an admin can write test settings.
- Keep GitHub as the version and rollback vault while Supabase becomes the live data source.

## Files

- `supabase/schema-pilot.sql`: create the pilot tables and RLS policies.
- `supabase/schema-building-label-overrides.sql`: create editable building category and label overrides.
- `src/backend/supabase-config.js`: public Supabase URL and publishable key.
- `src/backend/supabaseClient.js`: shared Supabase browser client.
- `src/backend/buildingOverrides.js`: shared building override loader and merge helper.
- `admin.html`: hidden admin pilot page.
- `admin.js`: sign-in and test read/write logic.

## Safe Keys

Safe to use in browser code:

- Project URL
- Publishable key

Never put these in browser code or chat:

- Secret key
- service_role key
- JWT secret
- Database password
- Connection string

## Setup

1. Open Supabase SQL Editor.
2. Run `supabase/schema-pilot.sql`.
3. Open `src/backend/supabase-config.js`.
4. Set `url` to your Supabase Project URL.
5. Set `publishableKey` to your Supabase publishable key.
6. In Supabase, open Authentication > Users and create a confirmed password user.
7. Open `admin.html` locally.
8. Sign in with that email and password.
9. After the first login, run the admin bootstrap SQL shown on `admin.html`.
10. Return to `admin.html` and test updating `backend_test_message`.
11. Run `supabase/schema-building-label-overrides.sql`.
12. Return to `admin.html`, reload labels, and edit building categories or labels.

Email code login is kept as a backup, but the built-in Supabase email sender is rate-limited and should not be used for repeated local testing.

## Data Flow

Runtime data comes from Supabase.

GitHub remains the rollback vault. Later, published Supabase data should be exported back into JSON snapshots under a dedicated snapshot folder.

Building category and dorm label edits use a database override layer. Local JSON remains the fallback, so the map can still load if Supabase is unavailable.
