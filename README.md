# Fitness App

A mobile app that helps people who just moved to a city find trainers, gyms, studios and run clubs. Free for users; businesses pay to be listed.

Built with Expo (React Native, TypeScript), Expo Router and Supabase.

## Run it

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

## How work gets done

Issues here are taken to pull requests by the [G.O.A.T. AI factory](https://github.com/Alseals1/goat-ai). See `CLAUDE.md` for the rules that humans and agents follow.
