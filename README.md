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

Local Supabase (needs Docker): `npx supabase start`, then put the printed API URL and anon key in `.env`.

## Check it

```sh
npm run lint
npm run typecheck
npm test
```

CI (`.github/workflows/ci.yml`) runs `npm ci` and these three checks on every pull request and every push to `main`, on the Node version in `.nvmrc`. If any check fails, the PR's `CI / checks` status fails. CI needs no secrets or `.env`.

## How work gets done

Issues here are taken to pull requests by the [G.O.A.T. AI factory](https://github.com/Alseals1/goat-ai). See `CLAUDE.md` for the rules that humans and agents follow.
