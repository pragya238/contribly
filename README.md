# Contribly

A beginner-focused contribution workspace built with React, TypeScript, Vinext, and accessible Radix/Shadcn primitives.

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
- Optional live public GitHub issue and repository retrieval, with rate-limit/error feedback.
- Ten-step contribution workflow with explanations, commands, checklists, and completion validation.
- Contextual demo mentor for issue understanding, Git, debugging, testing, review and PR outlines.
- Device-local contribution tracking, validated PR links, review status, merge and completion milestones.
- Responsive layout, accessible dialogs/selects/checkboxes and a feature-detected WebMCP search tool.

## Boundaries

This is an MVP demo. Initial issue tasks and repository statistics are illustrative; demo links lead to real repository issue lists. The live-data button requests current unassigned good-first-issue records from GitHub's public API. Public API rate limits apply. Live language and popularity are fetched from repository metadata; difficulty is inferred from the label, not verified.

The mentor is a transparent deterministic teaching guide, not a connected LLM. It does not inspect code or diagnose arbitrary errors. Replace `mentorReply` in `lib/contribution.ts` with a server-backed model adapter to enable an AI service; never put API keys in browser code.

Preferences, saved issues and contribution records are stored in localStorage on this browser only. No account sync is implemented. PR submission/review/merge actions are self-reported; this app does not post to GitHub or automatically verify merges.

## Architecture

`app/page.tsx` composes discovery, onboarding, workspace, dashboard, and shared controls. `lib/contribution.ts` contains typed issue and contribution models, the demo issue dataset, workflow content, and the mentor adapter. `app/globals.css` owns visual tokens and responsive styles. Existing starter server/storage helpers are available for future durable persistence.
