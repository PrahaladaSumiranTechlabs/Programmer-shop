# ProgrammerShop — Claude Instructions

## Project Overview
ProgrammerShop (`programmershop.in`) is a Next.js 14 App Router site with 13 free, in-browser developer tools.
All tools live under `src/app/tools/<tool-name>/page.tsx` and are `'use client'` components.
No backend, no auth, no data sent anywhere — everything runs client-side.

## Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS (dark theme, `slate-950` base)
- **Key libs:** `marked@9.1.6`, `highlight.js@11.9.0`, `html2pdf.js@0.10.1`
- **Deployment:** Vercel → `programmershop.in`
- **Repo:** `https://github.com/PrahaladaSumiranTechlabs/Programmer-shop`

## Architecture Rules
- Every tool page must be `'use client'`
- No new npm packages without discussion — prefer vanilla JS/browser APIs
- Tailwind Preflight resets `list-style: none` globally — scope preview CSS with an ID prefix (`#tool-id`) to override
- For viewport-locked layouts (like markdown-pdf), use `position: fixed; inset: 0` on the root div, NOT `height: 100dvh`
- `html2pdf.js` must use the chained API: `.set(options).from(element).save()`
- EyeDropper API available in Chrome/Edge 95+ — always gate with `!!window.EyeDropper`

## Adding a New Tool — Checklist
1. Create `src/app/tools/<tool-name>/page.tsx`
2. Add a card entry to the `tools` array in `src/app/page.tsx`
3. Bump `{ value: 'N', label: 'Live tools' }` in the `stats` array in `src/app/page.tsx`
4. Add a footer `<Link>` in `src/app/page.tsx`
5. Update the hero banner text (live tool count + tool names)
6. Run `npx tsc --noEmit` — must pass with zero errors
7. Commit and push

## gstack

gstack is installed at `~/.claude/skills/gstack`.

### Web Browsing
- **Always use `/browse` for all web browsing tasks.**
- **Never use `mcp__claude-in-chrome__*` tools directly.**

### How the Team Should Use gstack on This Project

#### Day-to-day development
| Task | Skill to use |
|---|---|
| Building a new tool end-to-end | `/ship` — plans, implements, and verifies the whole feature |
| Reviewing a PR before merge | `/review` — catches logic bugs, Tailwind issues, TS errors |
| QA-ing a tool on the live site | `/qa` — runs a full pass: functionality, edge cases, mobile |
| Investigating a bug report | `/investigate` — traces root cause with evidence |
| Browsing MDN / CanIUse / npm docs | `/browse` — structured, citation-backed research |

#### Planning new tools
| Task | Skill to use |
|---|---|
| Planning a new tool feature set | `/autoplan` — generates a spec + task breakdown |
| Getting engineering feedback on a plan | `/plan-eng-review` |
| Checking if a design feels right | `/plan-design-review` |
| Rapid UI exploration for a new tool | `/design-shotgun` |
| Generating an HTML prototype | `/design-html` |
| Reviewing the final visual design | `/design-review` |

#### Shipping & quality
| Task | Skill to use |
|---|---|
| Deploying to Vercel after merge | `/land-and-deploy` |
| Running a canary before full rollout | `/canary` |
| Locking a branch during an incident | `/freeze` / `/unfreeze` |
| Writing release notes / changelog | `/document-release` |
| Team retrospective after a sprint | `/retro` |

#### Learning & onboarding
| Task | Skill to use |
|---|---|
| Understanding a new browser API | `/learn` |
| Onboarding a new contributor | `/office-hours` |

### Recommended Team Workflow for a New Tool

```
1. /autoplan   → spec the tool, agree on scope
2. /plan-eng-review  → sanity-check technical approach
3. /design-shotgun   → explore UI quickly
4. /design-html      → build an HTML prototype
5. /ship             → implement in Next.js
6. /review           → code review before PR merge
7. /qa               → full QA pass (desktop + mobile)
8. /land-and-deploy  → deploy to Vercel
9. /document-release → update changelog / release notes
```

### Available gstack skills (full list)
`/browse`, `/connect-chrome`, `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`,
`/plan-design-review`, `/plan-devex-review`, `/design-consultation`, `/design-shotgun`,
`/design-html`, `/design-review`, `/review`, `/ship`, `/land-and-deploy`, `/canary`,
`/benchmark`, `/qa`, `/qa-only`, `/setup-browser-cookies`, `/setup-deploy`, `/setup-gbrain`,
`/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/devex-review`,
`/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`
