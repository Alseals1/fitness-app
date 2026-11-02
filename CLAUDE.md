# Fitness Finder

A mobile app that helps people who just moved to a city find a trainer, gym, studio or run club that fits them. Users use it free. Businesses pay to reach new residents.

**What to build is defined in [docs/prd.md](docs/prd.md). Read it before you plan or build anything.** If an issue asks for something the PRD lists under "Not building yet", or contradicts the PRD, stop and ask a question instead of building it.

Stack: Expo (React Native, TypeScript), Expo Router, Supabase (Postgres, Auth, Row Level Security). Mobile first.

@AGENTS.md

## Commands

Run these from the repo root. Dependencies are installed with `npm install`.

```sh
npm run lint        # expo lint (ESLint)
npm run typecheck   # tsc --noEmit
npm test            # jest (jest-expo)
npm start           # Expo dev server
npx expo-doctor     # check dependencies and config
```

**Before a PR, run `npm run lint`, `npm run typecheck` and `npm test`. All three must pass.** Say so in the PR if one fails for a reason your change did not cause.

## Conventions

- Routes are files in `src/app/` (Expo Router). Keep components, hooks and utilities outside `src/app/`, for example in `src/components/`, `src/hooks/` and `src/lib/`.
- TypeScript strict mode. No `any` without a comment that says why.
- Add a package with `npx expo install <package>`, never `npm install <package>`: it picks the version that matches the Expo SDK. Add a new dependency only when the plan says so.
- Put a test next to the code it covers (`foo.ts` and `foo.test.ts`). Test pure logic with jest. A new screen needs at least one test of its logic.
- The `ios/` and `android/` folders are generated. Never create or edit them.
- Do not hard-code colors, spacing or strings that repeat: put them in one shared place.

## Supabase

- The client is `src/lib/supabase.ts`. It reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`).
- Use only a **local** Supabase (`npx supabase start`, needs Docker) with seed or sample data. Never point the app, a test or an agent at a hosted project. Never run `supabase link`, `supabase db push`, `supabase functions deploy` or any command against a remote.
- Database changes are migration files in `supabase/migrations/`, never edits by hand. Every table has Row Level Security on, with a policy for each way the app reads or writes it.
- The anon key is public by design. Never put a service-role key, a secret or a real user's data in the app, in tests, in a PR or in a comment.
- A new migration, an auth change or a new permission is a gate item: say so in the plan.

## Product rules

These come from the PRD. If the PRD and this list ever differ, the PRD wins.

- **One city for v1: Birmingham / Hoover.** Do not build multi-city support.
- **Free for users:** no paywall, no ads, no account needed just to browse listings.
- **Listings are approved by a person before they are public.** Every new or claimed listing starts as pending, and nothing pending is ever shown to users or returned by a public query.
- **Listings are entered by hand by the owner, plus a business sign-up form.** Do not build imports or scrapers.
- **Ranking is based on fit, never on payment.** Paid placement, when it exists, is always labeled "Sponsored" and never hides a better-matching free listing. Payments are not part of v1.
- **Not building yet:** reviews and ratings, in-app chat, booking and payments, a map view, multiple cities, social features, a visitor-only flow.
- Do not collect more personal data than a feature needs. Location is approximate (part of town) unless the user asks for "near me" in that moment.
- Never show a "certified" mark without proof; never remove honest negative information for payment.

## Working with G.O.A.T. AI

Issues in this repo are worked by G.O.A.T. AI (`Alseals1/goat-ai`): agents plan, build and review, and a person merges.

- Branches are `goat/<issue number>-<slug>`. PR bodies contain `Refs #<issue number>`, never `Closes`, `Fixes` or `Resolves`: a person closes the issue.
- Never build, publish or release the app: no `eas build`, `eas submit`, `eas update`, `fastlane` or store uploads. A person does that.
- Never commit `.env`, keys or build output.
