# Frontend Architecture: tenso Ordering and Approval

**Scope:** the web app for warehouses, tenso approvers, and the Kumon administrator.
**Status:** working prototype. It runs against a built-in mock server. The Django backend is not connected yet.
**Related:** `../system_architecture.md` describes the whole system (backend, database, Answer integration, billing). This document covers only the frontend.

---

## 1. Purpose

Warehouses request materials. tenso approvers approve them once a day in a batch. Approved orders are sent to Kumon Shiki Kogyo as a CSV file. The app also shows the monthly billing per warehouse and the send log.

The app is one codebase with three roles. Each role sees its own menu and pages.

## 2. Technology

| Area                 | Choice                                                |
| -------------------- | ----------------------------------------------------- |
| UI framework         | Vue 3 (Composition API, `<script setup>`), TypeScript |
| Build and dev server | Vite 8                                                |
| Routing              | Vue Router 5, with route guards                       |
| State                | Pinia 4                                               |
| Translations         | vue-i18n 11 (English and Japanese)                    |
| HTTP                 | Axios (one shared client)                             |
| Styling              | Tailwind CSS 4                                        |
| Unit tests           | Vitest, with Vue Test Utils                           |
| Browser tests        | Playwright (Chromium; Firefox configured)             |

## 3. Folder structure

```
frontend/
  src/
    main.ts              App start: plugins, session check, idle and unauthorized handlers
    App.vue              Root component (router view only)
    router/              Routes per role, route guards, route meta types
    layouts/             AppLayout: header, role menu, idle warning, toast
    views/               One component per page
      warehouse/         Warehouse pages (requests, drafts, processed)
      approver/          Approver pages (inbox, received)
      admin/             Admin pages (items, destinations, accounts, mail)
    components/          Shared pieces (OrderTable, language and demo switches)
      ui/                Base controls (button, input, select, date picker, alert, badge, table)
    composables/         Reusable logic (order lists, idle logout, mailbox, toast)
    stores/              Pinia stores: auth (session), masters (items and warehouses)
    api/                 One module per backend area; all calls go through client.ts
    i18n/                en.ts, ja.ts (same keys), index.ts (language), errors.ts (error text)
    types/               Shared domain types (roles, orders, masters, mail)
    utils/               Pure helpers: lot rules, amounts, CSV, dates, downloads
    test/                Test helpers
  e2e/                   Browser tests (Playwright)
  vite.mock.ts           Mock backend used in development and tests
  openapi/schema.yaml    Draft API contract (to be replaced by the Django schema)
```

## 4. Layers

The code is split into layers. Each layer only talks to the one below it.

```
Views and layout  →  composables and stores  →  api modules  →  client (Axios)  →  server
                                                                      │
                                                  mock server (development only)
```

- **Views** show data and handle user actions. They hold no business rules beyond form checks.
- **Composables and stores** hold shared logic: loading order lists, the idle timer, the mailbox, the session, and cached masters.
- **API modules** wrap each backend area (auth, orders, approvals, masters, send log, billing, mail, demo accounts). They are the only place that knows endpoint paths.
- **client.ts** adds the session header and CSRF token, and turns errors into `ApiError` objects with a status, message, field, code, and values.
- **Utils** hold pure functions that are easy to test: lot checks, amounts, CSV building, dates.

## 5. Roles and routes

Three roles. The role decides the home page, the menu, and which routes the guard allows.

| Role                  | Home page  | Pages                                                                                                                                                                           |
| --------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Warehouse (倉庫)      | `/orders`  | Request list (`/orders`), new request (`/orders/new`), edit draft or returned order (`/orders/:no/edit`), drafts (`/drafts`), processed (`/latest`), mail (`/mail`)             |
| Approver (tenso)      | `/pending` | Proxy request (`/proxy`), unprocessed inbox (`/pending`), received (`/received`), send log (`/sendlog`), CSV format (`/csv-spec`), monthly billing (`/billing`), mail (`/mail`) |
| Administrator (Kumon) | `/sendlog` | Send log, CSV format, monthly billing, item master (`/items`), destination master (`/destinations`), accounts (`/accounts`), mail (`/mail`)                                     |

Shared by all signed-in users: order detail (`/orders/:no`), change password (`/password`).

Public: sign-in picker (`/login`) and one sign-in page per role (`/login/warehouse`, `/login/approver`, `/login/admin`).

**Route guards** (`router/index.ts`):

1. Restore the session once, on the first navigation.
2. Sign-in pages send a signed-in user to their home page.
3. Pages that need sign-in send guests to the sign-in picker, keeping the page they asked for.
4. Pages with a role list send other roles to their own home page.

The order detail page and the mail page are role-checked on the server as well (the server refuses other roles' data).

## 6. Main flows

### 6.1 Order lifecycle

```
Draft ──save──▶ Draft                       (warehouse, own drafts only)
  │
  └─submit─▶ In progress ──approve──▶ Approved ──▶ CSV created and sent to Kumon (send log)
                  │
                  ├─return (reason)──▶ Returned ──edit & resubmit──▶ In progress
                  └─reject (reason)──▶ Rejected
```

- Status words are the same for warehouses and approvers.
- Each step is recorded in the order's history with the person and time. Entries cannot be edited.
- A **proxy request** is an order an approver enters for a warehouse. It needs a reason and can be approved at the same time.

### 6.2 Approval

- The approver's inbox lists orders waiting for approval, for all five warehouses.
- Orders can be approved one by one or several at once (checkboxes).
- A return or rejection requires a comment, which the warehouse sees in its list.

### 6.3 CSV to Kumon

- The CSV has 15 columns, defined once in `utils/csv.ts` and shown on the CSV format page.
- The file is built from the order and the masters on the client. The server stores a copy of each file that was sent.
- The send log shows the full sent date, order number, warehouse, file name, line count, and result. A failed send can be retried.
- Shift_JIS encoding is expected by Kumon but not implemented yet. Downloads use UTF-8 with a byte-order mark so Excel opens them correctly.

### 6.4 Mail (demo)

- The server records the emails the app would send to an outbox. Nothing is sent to real addresses.
- Each person sees the messages sent to their own address; the administrator sees all of them.
- The mail page refreshes every 5 seconds. The menu shows a count of unread messages, which is stored per person in the browser.

### 6.5 Session and security (frontend part)

- Sessions use a server cookie. The client sends the CSRF header on unsafe requests.
- Signed-in users are logged out after 30 minutes without activity. A warning appears in the last minute, with a button to stay signed in.
- Approvers and administrators enter an email code after their password. Five wrong passwords lock the ID.
- Any signed-in user can change their password.

### 6.6 Language

- English is the default. Japanese is available from the header and the sign-in pages. The choice is kept in the browser.
- Every visible string comes from `i18n/en.ts` or `i18n/ja.ts`. The two files have the same keys; the type checker enforces this.
- Server validation errors carry a code and values, which the client translates (`serverErrors.*`), so the messages follow the language.
- Dates follow the language. Sample data (item names, addresses, staff names) stays in Japanese.

## 7. The mock backend

`vite.mock.ts` is a Vite plugin that serves `/api` during development and tests. It is enabled by `VITE_MOCK_API=true` (see `.env.development`).

- It holds the sample data from the prototype: five warehouses, ten items, ten accounts, and a set of orders.
- It implements the same endpoints the real backend is expected to provide, with the same role rules.
- It has a test reset endpoint (`/api/__mock/reset/`) that restores the sample data before each browser test.
- Sample accounts are listed on the sign-in pages and in the demo switcher. They exist only with the mock.

When the Django backend is ready, set `VITE_API_BASE_URL`, set `VITE_MOCK_API=false`, and replace `openapi/schema.yaml` with the backend's schema (see the README, section 4).

## 8. Shared UI components

- **Base controls** (`components/ui/`): button, input, select, date picker (with a Japanese calendar and keyboard support), alert, badge, table.
- **Order table** (`components/OrderTable.vue`): the one list used by all order pages (status, progress, comment, resubmit where allowed).
- **Switches:** language switch (header and sign-in pages); demo account switch (mock only).
- **Toast and idle warning:** shown from `AppLayout`.

Styling is Tailwind utility classes. The header and menu are dark; content areas are light, so forms and tables stay easy to read.

## 9. Testing

| Level      | Tool       | What it covers                                                                                                                   | Run with           |
| ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Unit       | Vitest     | Lot rules, amounts, CSV building, idle timing, input component, password toggle                                                  | `npm test`         |
| Type check | vue-tsc    | Types and translation keys in components                                                                                         | `npx vue-tsc -b`   |
| Lint       | ESLint     | Code style and unused code                                                                                                       | `npm run lint`     |
| Browser    | Playwright | Sign-in and roles, ordering and resubmitting, approval, send log, masters, billing, mail, idle logout, password change, language | `npm run test:e2e` |

Browser tests run one at a time (the mock keeps shared state) and start the dev server on their own. Clock-based tests (idle logout) use Playwright's fake clock.

## 10. Build and scripts

| Command            | Purpose                                                              |
| ------------------ | -------------------------------------------------------------------- |
| `npm run dev`      | Development server with the mock backend (when `VITE_MOCK_API=true`) |
| `npm run build`    | Type check and production build into `dist/`                         |
| `npm run lint`     | ESLint with zero warnings allowed                                    |
| `npm test`         | Unit tests                                                           |
| `npm run test:e2e` | Browser tests                                                        |
| `npm run gen:api`  | Regenerate `src/types/api.ts` from `openapi/schema.yaml`             |

## 11. Key decisions

| Decision                                                       | Reason                                                                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| One app for three roles, with route guards                     | One deployment; the menu and pages follow the role.                                                     |
| Domain types written by hand (`types/index.ts`)                | The draft API schema does not yet match the screens. Generated types are kept only for the error shape. |
| Mock backend inside the dev server                             | The screens can be tested and demonstrated before the backend exists, with the same endpoints.          |
| Errors carry codes, not text                                   | The app can show messages in both languages, and the backend does not need to speak Japanese.           |
| CSV built on the client, stored by the server                  | Keeps the exact file that was sent, for the send log and for resending.                                 |
| Japanese and English kept as separate files with the same keys | Type checking catches a missing translation.                                                            |
| Idle timer in the browser                                      | Matches the stated security promise; the server must enforce its own session expiry too.                |

## 12. Known limits and open items

- **Backend:** no real backend yet. Data, sending, and mail are simulated by the mock.
- **Email:** the outbox is a demo. Real email needs a mail account and recipient list from the client.
- **Kumon connection:** approved orders are not sent anywhere real. The send method (API, file, email, or EDI) and the Shift_JIS format are still to be agreed.
- **Kumon status:** no production or shipping updates are shown. This needs updates from Kumon's system.
- **Sample data:** item names, sites, and staff are placeholders in Japanese.
- **Browsers and devices:** tested in Chromium on a desktop-sized screen only. Firefox and phones are not yet checked.
- **Translations:** English wording needs a review by the client.

## 13. Next steps

1. Get the open answers from the client (sites, approvers, send method, CSV format, lot rule, invoice format).
2. Build the Django backend to the endpoints the mock already implements, and update the API schema.
3. Connect the frontend to the backend and run the browser tests against it.
4. Add email sending on the backend, and real send status from Kumon.
5. Check Firefox and phone layouts, and remove the leftover components.
