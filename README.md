# Fitness Finder

A mobile app that helps people who just moved to a city find a trainer, gym, studio or run club that fits them. Free for users; businesses pay to reach new residents. What to build is in [docs/prd.md](docs/prd.md).

Built with Expo (React Native, TypeScript), Expo Router and Supabase.

## Run it

Use Node 24 (the version in `.nvmrc`; `nvm use` picks it up).

```sh
npm install
cp .env.example .env      # then fill in the local Supabase values
npm start
```

## Local Supabase

The app only ever talks to a **local** Supabase with sample data. Never run `supabase link`, `supabase db push` or any command against a hosted project.

1. Start Docker.
2. Start Supabase from the repo root (the first run downloads images):

   ```sh
   npx supabase start
   ```

3. Run `npx supabase status` and copy the API URL and the anon (publishable) key into `.env`.
4. Apply the migrations in `supabase/migrations/` and load the sample places in `supabase/seed.sql`. This wipes the local database:

   ```sh
   npx supabase db reset
   ```

5. Run the database tests (pgTAP, in `supabase/tests/database/`). They are not run in CI yet.

   ```sh
   npx supabase test db
   ```

After changing a migration, regenerate the TypeScript types and commit the file unedited:

```sh
npx supabase gen types --local --lang typescript --schema public > src/lib/database.types.ts
```

Reading places: the API may not read `submitted_by` or `claimed_by`, so `select('*')` on `places` fails. Select `PUBLIC_PLACE_SELECT` from `src/lib/places.ts` instead.

To make yourself an admin locally (to approve, reject, hide or verify places), sign up in the app, then run this in Studio's SQL editor (http://127.0.0.1:54323):

```sql
insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
```

## Check it

```sh
npm run lint
npm run typecheck
npm test
```

CI (`.github/workflows/ci.yml`) runs `npm ci` and these three checks on every pull request and every push to `main`, on the Node version in `.nvmrc`. If any check fails, the PR's `CI / checks` status fails. CI needs no secrets or `.env`.

## How work gets done

Issues here are taken to pull requests by the [G.O.A.T. AI factory](https://github.com/Alseals1/goat-ai). See `CLAUDE.md` for the rules that humans and agents follow.
