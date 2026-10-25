# Driving Practice

## Rules

1. Cut taglines, helper text and secondary labels. If a screen needs them to make sense, fix the layout.
2. Make the best decision that will elevate all three: the user experience (UX), developer experience (DX), and agent experience (AX) always, without breaking anything.

Explanations belong in the Tutorial tour (`src/ui/tutorial.ts`), not on the screen. Keep status lines (what just happened, what is blocking), legal notices and data attribution (OpenStreetMap, DVSA).

## Layout

- `sim/index.html`: every screen and the HUD. `src/app/main.ts` wires them.
- `src/`: the simulator (Babylon.js 9, TypeScript). `src/access/` is sign-in, sessions and the free try.
- `server/`: the accounts, payments and support service (Node 22). See `server/README.md`.
- `public/`: static pages (`admin.html`, `support.html`, `legal/`) and assets.
- `tests/unit/` (vitest), `tests/browser/` (Playwright), `server/test/`.

## Commands

```sh
npm run build          # typecheck + build to dist-sim
npx vitest run         # unit and server tests
npm run build:server   # server typecheck + build
PW_CHROMIUM=/opt/pw-browsers/chromium npx playwright test --workers=1   # browser tests (serve dist-sim: build first)
```

Run the tests that cover what you changed before committing. When a test asserts text you removed, assert the behaviour instead.

## Never

- Print, log or commit secrets (Stripe, Resend, Azure Speech, Mongo, webhook secrets).
- Deploy to production (vr.drivingpractice.live) without the owner's explicit go-ahead for that deploy.
- Switch payments to live, or change billing or quotas, without approval.
- Force-push, or skip or disable a test to get green.
