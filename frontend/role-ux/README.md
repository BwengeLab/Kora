# Kora — Per-Role UI/UX & Navigation Docs

One dedicated UI/UX + navigation document **per role** — the page/screen-level design each role's frontend is built from. Each doc states: the role's **pages (web) / screens (desktop)**, what's **on each**, the role's **navigation/workflow flow**, and the **features & functions** associated with each page.

**Shared rules (apply to every role doc):**
- **Entry = Home.** Every role signs in and lands on **Home** (their role-tailored dashboard).
- **Web pages == desktop screens.** Same screens; the desktop app wraps the same UI (adds local file drag-drop, native notifications). So "page" and "screen" are the same thing, one design.
- Built from the shared design system + workspace-module library (see `../16-ROLE-EXPERIENCE-BLUEPRINTS.md`); rendered per the permission model (`../14-ROLE-FRONTEND-MAP.md`); flagship screens detailed in `../15-FLAGSHIP-SCREENS.md`.
- **Equal quality for all** — every role's experience is complete and premium, never barren.

**The roles (all 7 complete):**
1. `01-super-admin.md` — Platform Command Center ✅
2. `02-organization-owner.md` — Business Command Center ✅
3. `03-finance-lead.md` — Finance Control Center ✅
4. `04-finance-operator.md` — Reconciliation Cockpit / My Work ✅
5. `05-auditor.md` — Audit & Risk Command Center ✅
6. `06-org-admin.md` — Admin Console ✅
7. `07-external-collaborator.md` — Shared Portal ✅
8. Custom roles → auto-composed from the same modules (see `../16-ROLE-EXPERIENCE-BLUEPRINTS.md` §4)
