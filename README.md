# Guhr Mandanten-Onboarding-Board

Kanban-style CRM board for the client onboarding process at Guhr Steuerberatungsgesellschaft mbH. The app is built as a focused trial project: serious enough to review in a GitHub repository, lightweight enough to run locally, and specific to a tax advisory onboarding workflow instead of a generic Trello clone.

The product scope follows the original assignment in [docs/trial-project-brief.md](docs/trial-project-brief.md).

## Live Application

The deployed application is available at [https://guhr.albo.systems](https://guhr.albo.systems).

## Local Start

```bash
npm install
npm run dev
```

The app then runs at [http://localhost:3000](http://localhost:3000).

Useful checks before review:

```bash
npm run lint
npm run build
```

For the email notification automation, create a local `.env.local` based on `.env.example`:

```bash
RESEND_API_KEY=...
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=Guhr Onboarding Board
AUTOMATION_RECIPIENT_EMAIL=notifications@example.com
AUTOMATION_RECIPIENT_NAME=Onboarding Team
NEXT_PUBLIC_AUTOMATION_RECIPIENT_EMAIL=notifications@example.com
NEXT_PUBLIC_AUTOMATION_RECIPIENT_NAME=Onboarding Team
```

The API key is server-side only and must not be committed.

## Tech Stack

- **Next.js App Router + TypeScript** for a maintainable React application with clear component and state boundaries.
- **Tailwind CSS** for fast, consistent styling and a Guhr-specific visual system.
- **dnd-kit** for smooth drag and drop between onboarding phases.
- **Zustand + localStorage** for a runnable local version without requiring a backend.
- **lucide-react** for restrained interface icons.
- **Hanken Grotesk** via `next/font` for the clean, professional typography used in the UI.

## Product Flow

The board maps the onboarding process from first inquiry to active mandate. The phases are:

1. Neue Anfrage
2. Erstgespräch geplant
3. Unterlagen angefordert
4. Unterlagen erhalten
5. Mandatsvertrag versendet
6. Unterzeichnet & aktiv
7. Pausiert
8. Verloren

`Pausiert` and `Verloren` are included as practical off-pipeline states. They keep stalled or declined opportunities visible without mixing them into the active onboarding flow.

## Core Features

- Drag and drop cards between phases without a page reload.
- Detail drawer for each card with contact data, qualification data, team ownership, contact history, checklist progress, next task and notes.
- Add a new mandate directly in any column.
- Assign a responsible team member through a dropdown, with default members and the option to add custom names and colors.
- Track contact attempts with channel, status, date and time. Cards in `Neue Anfrage` show a visible warning only after unsuccessful contact attempts.
- Keep onboarding checklist progress visible only when it is relevant to the current phase, instead of showing early `0/5` warnings before the checklist work has started.
- Prevent moving a mandate to `Unterzeichnet & aktiv` until the required onboarding checks are complete.
- Confirm automation-triggering moves before they run, so accidental drag-and-drop does not send emails.
- Send notification emails for appointment preparation, internal review, mandatory-check follow-up and team handover workflows.

## UX Decisions

The brief asks for important card information at a glance, while also asking for a clean, uncluttered layout for non-technical staff. I interpreted that as a scanning-first board: each card shows the information needed to judge ownership and next operational state quickly, while sensitive or longer details are one click away in the drawer.

On the card itself, the app prioritizes:

- client name and company,
- mandate type/legal form,
- assigned team member,
- onboarding date,
- phase-relevant status indicators,
- contact-attempt warning when relevant.

Email, phone number, qualification details, next task and notes are placed at the top of the drawer instead of permanently crowding every card. This keeps the board readable when many mandates are visible at once, while still making the full CRM record immediately accessible.

## Domain Logic

- New inquiries stay in `Neue Anfrage` even when a team member tried to call or email them. Instead of creating another pipeline column, contact attempts are marked directly on the card.
- Checklist progress appears from `Unterlagen angefordert` onward, or earlier only once a checklist item has actually been started.
- `Nicht zugewiesen` is the default team state and is visually neutral. Assigned team members are shown as colored capsules.
- The activation gate requires GwG identification, power of attorney, signed engagement letter, SEPA mandate and DATEV setup before a card can become active.
- Lost mandates carry a loss reason so the pipeline does not silently hide why an inquiry dropped out.
- Automation triggers are intentionally explicit: the user sees a preview and must confirm before an email is sent or the status change is logged.

## Automations

The board includes four automation points:

- **Erstgespräch geplant**: email with appointment-preparation context for the responsible person.
- **Unterlagen erhalten**: email to the configured notification recipient with an internal review task.
- **Mandatsvertrag versendet**: email to the configured notification recipient with open mandatory checks before activation.
- **Unterzeichnet & aktiv**: email to the configured notification recipient for handover into ongoing support.

Before any of these actions run, the board opens a confirmation dialog showing what will happen. Cancelling the dialog leaves the card in its original phase.

## Seed Data

The seed data includes realistic sample mandates across common tax advisory cases:

- GmbH, UG, GbR, GmbH & Co. KG, OHG, freelancers, trades and small businesses.
- Different onboarding stages, checklist states, due dates and team assignments.
- Paused and lost cases to show how non-linear onboarding situations are handled.

The data is intentionally fictional and only used to demonstrate the workflow.

## Workflow And Tools

My approach was:

1. Preserve the original task in `docs/trial-project-brief.md` and use it as the scope anchor.
2. Build a small Next.js application instead of relying on a Trello template or generic board UI.
3. Model the onboarding process first, then add UI interactions around real Kanzlei tasks: contact attempts, document status, assignment and activation checks.
4. Iterate on the board and drawer layout to reduce noise while keeping important information reachable.
5. Use AI assistance through Codex for implementation speed, copy review and refactoring suggestions. Product decisions and final edits were reviewed manually against the assignment.
6. Validate with local linting and production build checks.

## Current Limitations

- State is stored in `localStorage`, so this is a local trial version rather than a multi-user production CRM.
- Email automations currently send to a configured notification recipient. A production version would map team members to real work email addresses and use provider-managed templates.
- There is no authentication or role model yet.
- DATEV, document upload and inquiry-source integrations are intentionally left out to keep the trial focused.

## With More Time

- Replace `localStorage` with a backend such as Postgres plus Prisma.
- Add user accounts, roles and shared team state.
- Connect n8n or additional provider-side workflows for multi-step notification automations.
- Add document upload/review states and DATEV handover support.
- Add analytics for bottlenecks, for example where inquiries stall most often.
- Add audit history per mandate for a more complete CRM record.

## Time Spent

Initial build plus UX iterations, automation wiring, README, deployment and validation: approximately 5-6 focused hours.
