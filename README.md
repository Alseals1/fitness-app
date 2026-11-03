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

### Become an admin locally

Admins approve, reject, hide and verify places, add places by hand, decide claims and mark trainers certified, from the Admin screen. Nothing here is committed, and only use a made-up email such as `admin@example.com`.

1. Create the account: either tap **List your business → Create an account** in the app, or open local Studio (http://127.0.0.1:54323), go to **Authentication → Users → Add user → Create new user**, enter an email and a password, and tick **Auto Confirm User**.
2. In Studio's SQL editor, make that user an admin:

   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'admin@example.com';
   ```

3. In the app, tap **Sign in** on the home screen and sign in with that email and password. An **Admin** link appears.

To revoke admin, delete the row (`delete from public.admins where user_id = ...`). It takes effect at once in the database; the app notices on the next sign-in. A signed-in user who is not an admin sees no **Admin** link and cannot open the Admin screen. The database refuses their admin calls either way.

### Try the business form locally

1. In the app, tap **List your business → Create an account** and sign up with a made-up email such as `owner@example.com`. Locally, email confirmation is off, so you are signed in at once.
2. Tap **List your business** again, then **Add a new listing** or **Claim an existing listing**. Give a business email or an official social account for verification.
3. Sign in as the admin. The new listing shows under **Pending listings** with a "From the business" block, and a claim shows under **Claims**.

Each account may send 5 submissions (new listings and claims together) in any 24 hours; the 6th is refused until the oldest is a day old. Everything a business sends starts as pending, and the verification details are visible only to the admin.

## Check it

```sh
npm run lint
npm run typecheck
npm test
```

CI (`.github/workflows/ci.yml`) runs `npm ci` and these three checks on every pull request and every push to `main`, on the Node version in `.nvmrc`. If any check fails, the PR's `CI / checks` status fails. CI needs no secrets or `.env`.

## How work gets done

Issues here are taken to pull requests by the [G.O.A.T. AI factory](https://github.com/Alseals1/goat-ai). See `CLAUDE.md` for the rules that humans and agents follow.
