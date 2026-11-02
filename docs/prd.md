# Fitness Finder: PRD

Nov 2, 2026 · Owner: Alandis

This is the source of truth for what the app is and is not. It was converted from `Fitness Finder — PRD.pdf` without changing its content. The agents read this file. Change it with a pull request when a decision changes.

## Decisions confirmed (2026-11-02)

- **First city:** Birmingham / Hoover.
- **Platform:** mobile first (the Expo app in this repo).
- **Where listings come from:** entered by hand by the owner, plus the business sign-up form. Nothing is imported at first.

## Overview

Fitness Finder helps people who just moved to a city find a trainer, gym, studio, or run club that fits them, fast. Users use it free; businesses pay to reach new residents.

**Status:** idea stage, not yet validated. The idea came from one person who moved and felt lost finding a gym or studio. Demand has not been tested beyond that.

### Decided so far

- Core user is new movers; visitors are a secondary audience.
- Users are free; businesses pay.
- Validate demand on Reddit (plus 2-3 direct conversations) before heavy building.

Marked as *recommendation* in this doc = proposed, not yet agreed. Everything else is open.

## Who it's for

Two sides: people looking for a place to train, and the businesses that want them as members or clients.

| Audience | Who they are | Priority |
| --- | --- | --- |
| New movers | Moved to the city in roughly the last 6 months; want a long-term gym, studio, trainer, or club | Primary |
| Visitors | In town for days or weeks; want a drop-in session | Secondary |
| Independent trainers | Solo personal trainers looking for new clients | Primary paying side (recommendation) |
| Small studios | Yoga, pilates, boxing, cycling, CrossFit-style boxes | Primary paying side (recommendation) |
| Run clubs | Free or low-cost community groups | Free listings; they draw users in (recommendation) |
| Chain gyms | Large national or regional gyms | Later; they have their own marketing |

## Problems and success

The user problem is fit and trust, not finding a list: Google shows gyms, but not which one suits your level, budget, schedule, and vibe. This is a hypothesis to test on Reddit.

| Side | Problem | What success looks like |
| --- | --- | --- |
| New mover | Feels lost; too many unknown options; doesn't know which places are beginner-friendly, affordable, or welcoming | Finds and visits a place that fits within their first 2 weeks in the city |
| Visitor | Wants a quick drop-in near where they're staying | Books or shows up to one session during the trip |
| Trainer / studio | Hard to reach people who just arrived; word of mouth is slow | Gets new members or clients they can trace back to the app |

### Proposed v1 metrics (targets to be set after validation)

- Searches that end in a contact or visit click
- Users who say they joined or tried a place
- Businesses that get at least one lead per month
- Businesses willing to pay after a free trial period

No numeric targets yet; setting them now would be guessing.

## Free vs. paid

Users never pay. Businesses list free and pay only for extra reach. Paid placement is always labeled "Sponsored" (recommendation: make this a firm rule, since trust is the product).

| Item | Who | Price |
| --- | --- | --- |
| Search, browse, save places | Users | Free |
| Basic listing (name, category, area, contact, price range) | Businesses | Free |
| Verified badge + full profile (photos, schedule, "good for beginners" tags) | Businesses | Paid (recommendation) |
| Featured / sponsored spot in results | Businesses | Paid, always labeled |
| Pay-per-lead (user taps contact or book) | Businesses | Possible later; needs tracking |

Prices are not set. Ask 3-5 trainers and studio owners what a new long-term client is worth to them before picking numbers.

**Rule:** sponsored listings never hide better-matching free listings. Ranking for regular results stays based on fit, not payment.

## V1 scope

Recommendation: launch in one city, Birmingham / Hoover, where you can personally meet businesses and seed listings by hand.

### Categories, in order (recommendation)

1. Small studios: clear schedules and prices; easy to list and compare.
2. Independent trainers: the side most likely to pay for clients.
3. Run clubs: free to join, great first stop for newcomers; brings users in.
4. Gyms: listed basic only at first.

### Core v1 features

- Short onboarding: goal (strength, cardio, yoga, running), level, budget, preferred times, part of town
- Matched results list with "why this fits you" tags (beginner-friendly, price range, schedule)
- Place profile: what it is, price range, schedule, contact or website link
- Save places to a shortlist
- Business sign-up form to claim or submit a listing
- Admin screen for you to approve listings and mark them verified

Target: about 30-50 hand-checked listings before showing it to real users. This number is a guess to make results feel useful; adjust after the first users try it.

## Not building yet

These wait until v1 shows people use the app and businesses get leads.

| Feature | Why it waits |
| --- | --- |
| Reviews and ratings | Need enough users to be meaningful; invite fake-review problems |
| In-app chat | Users can contact businesses by phone, website, or Instagram |
| Booking and payments | Studios already use booking tools; integrating is heavy |
| Map view | A list filtered by part of town is enough to start |
| Multiple cities | Prove one city first |
| Social features (friends, groups) | Run clubs already provide the community |
| Visitor-specific drop-in flow | Visitors are secondary |

## Trust and safety

Every listing is approved by a person before it goes live. At one-city scale, manual review is cheaper and safer than automation.

- **Manual approval:** new and claimed listings go to an admin queue; nothing is public until approved.
- **Verification:** confirm the business exists (website, Google Business profile, or social account) and that the person claiming it is connected to it (email from the business domain or a reply from its official account).
- **Trainer checks:** ask for a certification name; showing "certified" requires proof. Whether to require insurance or background checks is open; local rules may matter, so check before deciding.
- **Report button:** users can flag closed, wrong, or spammy listings.
- **Stale listings:** ask businesses to confirm details every few months; hide ones that don't respond.
- **Sponsored labels:** paid placement always labeled; no paid removal of honest negative info.
- **Safety for users:** meet trainers at public gyms or studios; show a short safety note on trainer profiles that train in homes or outdoors.

## Risks and open questions

The biggest risk is the two-sided marketplace: users won't come without good listings, and businesses won't pay without users. Seeding listings by hand in one city is the planned fix.

### Other risks

- Demand is unproven: one person asked for it. Reddit results may show Google and asking around are good enough.
- New movers need the app for only a few weeks, so user retention will be low by design; growth must come from new arrivals.
- Existing apps (Google Maps, ClassPass, Strava, Meetup) may cover enough of this. Not yet researched.
- Attributing signups to the app is hard, which makes pay-per-lead hard to price.

### Validation plan

- Search Reddit for past "new to [city], gym recommendations" threads
- Post the question and collect answers
- Talk to 2-3 people who moved recently
- Ask 3-5 trainers or studio owners what a new client is worth and whether they'd pay

### Open questions

- Is the core pain finding options, judging fit, or feeling awkward as the new person?
- ~~Which city first: confirm Birmingham / Hoover?~~ Confirmed (see Decisions).
- What do businesses pay, and how much?
- ~~Mobile app, web app, or both for v1?~~ Mobile first (see Decisions).
- ~~Where do listings come from: hand-entered, business-submitted, or imported?~~ Hand-entered, plus the business sign-up form (see Decisions).
- How do new movers discover the app (apartment complexes, realtors, employers, social)?
