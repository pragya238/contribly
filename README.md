# Contribly

A beginner-focused contribution workspace built with Next.js, React, TypeScript, and accessible Radix/Shadcn primitives. The frontend runs on Vercel; the account API runs on Render and stores workspaces in MongoDB Atlas.

## Run

Requires Node 22.13+.

```sh
npm run install:ci
npm run dev
npm run build
```

## Included

- Landing page, skill onboarding, recommendation ranking and explanations.
- Search, language/difficulty filters, sorting, bookmarks, and issue detail dialogs.
- Live all-GitHub search by default, with 30-result pagination, keyword/language/label filters, optional assignment filtering, and explicit rate-limit/error feedback.
- GSoC 2026 and LFX/CNCF Sep–Nov 2026 project presets with official source links, plus arbitrary GitHub organization/repository targeting.
- Ten-step contribution workflow with explanations, commands, checklists, and completion validation.
- Contextual demo mentor for issue understanding, Git, debugging, testing, review and PR outlines.
- Device-local contribution tracking, validated PR links, review status, merge and completion milestones.
- Responsive layout, accessible dialogs/selects/checkboxes and a feature-detected WebMCP search tool.

## Boundaries

This is an MVP demo. Initial issue tasks and repository statistics are illustrative; demo links lead to real repository issue lists. Discovery now loads live records by default from GitHub’s public API; illustrative demo issues require an explicit choice. Search supports six welcoming label variants, individual labels or all open issues. Program presets cover a dated curated subset, not the full program roster, and do not advertise current application openings. Public API rate limits apply. Live language and popularity are fetched from cached repository metadata. Unavailable metadata displays as unknown; issue difficulty is either a beginner-label signal or not assessed. GitHub limits each search to its first 1,000 results.

The mentor is a transparent deterministic teaching guide, not a connected LLM. It does not inspect code or diagnose arbitrary errors. Replace `mentorReply` in `lib/contribution.ts` with a server-backed model adapter to enable an AI service; never put API keys in browser code.

Preferences, saved issues and contribution records are saved to the signed-in account in MongoDB. Existing browser-only demo data can be imported explicitly from the account screen. PR submission/review/merge actions are self-reported; this app does not post to GitHub or automatically verify merges.

## Architecture

`app/page.tsx` composes discovery, onboarding, workspace, dashboard, and shared controls. `lib/contribution.ts` contains typed issue and contribution models, the demo issue dataset, workflow content, and the mentor adapter. `app/globals.css` owns visual tokens and responsive styles. Existing starter server/storage helpers are available for future durable persistence.

## Discovery architecture and checks

`components/discovery.tsx` owns search controls and isolated result sets. `lib/discovery.ts` validates scopes, builds GitHub queries, maps API records, handles pagination, and stores sourced program mappings. Saved records are merged by issue ID independently of the current search. Program affiliations are never inferred from issue keywords.

Run discovery integration-unit checks with Node 22.13+: `node --experimental-strip-types --test tests/discovery.test.mjs`. The tests use deterministic API fixtures; live query smoke checks were also performed for all-GitHub, GSoC, and LFX searches.


## Account personalization (MongoDB integration)

Auth.js verifies GitHub sign-in and maintains an encrypted session cookie. New visitors start at the themed `/login` page, with a signup option; their first GitHub sign-in creates their identity. Authenticated visitors see the personalized home page. The stable account key is `github:<GitHub account ID>`; supplied identity headers are never trusted. `app/api/workspace/route.ts` authenticates every read/write, checks same-origin writes, validates input, and proxies the session-derived user ID to the MongoDB backend over HTTPS. Browser-submitted ownership fields are rejected.

`backend/README.md` documents Node 24 hosting and secret configuration. In Vercel, configure `ACCOUNT_API_URL`, `ACCOUNT_SERVICE_SECRET`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, and `AUTH_GITHUB_SECRET`. Register the GitHub OAuth callback as `https://<production-domain>/api/auth/callback/github`. Import the repository root as Next.js and deploy `main`. Never put these secrets in browser variables or Git. GitHub accounts use separate identities from the retired ChatGPT login; existing ChatGPT workspaces are retained and are not automatically reassigned by email.

`hooks/use-account-workspace.ts` serializes and debounces saves, reports failures, prevents leaving silently with unsaved changes, and rejects cross-device revision conflicts. Old device-local demo data is only imported through an explicit account action.

Account behavior tests: `node --experimental-strip-types --test tests/accounts.test.mjs`. These use an in-memory MongoDB collection substitute to verify request authorization, per-user isolation, validation and revision conflicts. They do not establish connectivity to an Atlas cluster.
