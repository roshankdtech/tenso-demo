# tenso Ordering: Frontend

The web screens for the materials ordering system. Warehouse staff create and correct orders. tenso approvers approve or return them.

**Stack:** Vue 3, TypeScript, Tailwind CSS, Vite, Pinia, Vue Router, Axios, Vitest, Playwright.

Status: test run. The screens are built and tested against a development mock of the backend. The Django backend is not connected yet.

---

## 1. Setup

### Requirements

- **Node.js 22 LTS** (Vite 8 needs Node 20.19 or later). Check with `node -v`.
- **npm** (installed with Node). Check with `npm -v`.
- For browser tests: **Google Chrome** or Chromium and **Firefox**, installed by Playwright (see below).

### Install and run

```bash
cd frontend
npm install
npm run dev
```

Open **http://127.0.0.1:5173/login** in a browser.

Development sample accounts (mock only):

| Login ID        | Role                 | Password | Email code   |
| --------------- | -------------------- | -------- | ------------ |
| adachi-sato     | Warehouse (足立倉庫) | password | not needed   |
| tenso-takahashi | Approver (tenso)     | password | any 6 digits |
| kumon-admin     | Admin (久門紙器工業) | password | any 6 digits |

The mock also accepts the password `x` to test the lockout (five wrong tries lock the ID). The sample data is the prototype's: five warehouses, ten items, and the order list. The development login page lists the sample accounts; that list and the account switcher appear only when `VITE_MOCK_API=true`.

### Install browsers for tests (once)

```bash
npx playwright install chromium firefox
```

### Environment variables

| Name                | Default                                     | Purpose                                                                 |
| ------------------- | ------------------------------------------- | ----------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | `/api`                                      | Address of the Django API                                               |
| `VITE_MOCK_API`     | `true` in `.env.development`, otherwise off | `true` uses the built-in mock instead of the backend. Development only. |

Copy `.env.example` to `.env.local` to change values on your machine. Do not commit `.env.local`.

**Important:** `VITE_MOCK_API` must be `false` (or unset) in any build that uses the real backend.

---

## 2. Commands

| Command                                   | What it does                                               |
| ----------------------------------------- | ---------------------------------------------------------- |
| `npm run dev`                             | Start the development server                               |
| `npm run build`                           | Type-check and build the production files into `dist/`     |
| `npm run preview`                         | Serve the built files locally                              |
| `npm run lint`                            | Check code with ESLint                                     |
| `npm run format` / `npm run format:check` | Format code with Prettier, or check the formatting         |
| `npm run gen:api`                         | Regenerate TypeScript API types from `openapi/schema.yaml` |
| `npm test`                                | Run the unit tests (Vitest)                                |
| `npm run test:e2e`                        | Run the browser tests (Playwright) in Chrome and Firefox   |

The browser tests start the dev server automatically. Before each test they reset the mock with sample orders (`/api/__mock/reset?seed=test`). The development mock starts with no orders, so tenso approvers see only orders that warehouse users have entered.

---

## 3. Project layout

```
frontend/
  openapi/schema.yaml     Draft API contract (replace with the backend's schema)
  src/
    api/                  API client (auth, catalog, orders, approvals)
    components/           Screen parts (order form, return dialog)
    components/ui/        Shared controls (button, input, select, table, badge, alert, modal)
    i18n/                 Message files (English and Japanese)
    layouts/              App shell with header and navigation
    router/               Routes and role guards
    stores/               Login state (Pinia)
    types/                Shared types
    utils/                Status colours and date formatting
    views/                Screens (login, orders, new order, order details, resubmit, approvals)
  e2e/                    Browser tests
  vite.mock.ts           Development mock of the backend API
```

---

## 4. Connecting to the backend

1. Put the Django backend's schema in `openapi/schema.yaml`, or point the generator at its URL, then run `npm run gen:api`.
2. Set `VITE_API_BASE_URL` to the backend address.
3. Set `VITE_MOCK_API=false`.
4. Check that the endpoints match the draft contract. Differences show up as type errors after `gen:api`.
5. Run `npm test` and `npm run test:e2e`, and fix anything that breaks.

The backend must:

- use session cookies with the `csrftoken` cookie (the client sends it as `X-CSRFToken`)
- return validation errors (HTTP 422) with a `detail` message and, where possible, a `field` name
- return `401` when the user is not logged in, and `403` when the role is not allowed

---

## 5. Known issues and open decisions

| #   | Item                                                                                                                                 | Effect                                                                                 | Status                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Development mock is used when `VITE_MOCK_API=true`                                                                                   | Logins and data are fake                                                               | Expected until the backend is connected                                                                                                               |
| 2   | Draft API schema (`openapi/schema.yaml`)                                                                                             | Field and endpoint names may change                                                    | Replace with the backend schema                                                                                                                       |
| 3   | Validation messages from the server are in English                                                                                   | Japanese users see English for lot-size and similar errors                             | Needs translated messages or message codes from the backend                                                                                           |
| 4   | Item names, site names, and staff names come from the backend                                                                        | Shown as the backend sends them                                                        | Needs Japanese data if Japanese is enabled                                                                                                            |
| 5   | Language switch (English default, Japanese available). Japanese is the client's language; English text needs a review by the client. | Screens follow the chosen language; data samples (item names, addresses) stay Japanese | Check the English wording with the client                                                                                                             |
| 6   | Destination is typed in by hand, so a warehouse can enter any site code                                                              | Could send an order to the wrong site. The server only checks that the code exists.    | Waiting for the client. The form should probably be fixed to the warehouse’s own site.                                                                |
| 7   | The delivery check on receipt is not in the screens                                                                                  | Phase 2 feature                                                                        | Not built yet                                                                                                                                         |
| 8   | Approval routes and returns versus rejections                                                                                        | Screens show one approval step; the rules are for the backend                          | Waiting for the client's answer                                                                                                                       |
| 9   | Delivery date cannot be in the past                                                                                                  | This is a rule chosen by the team, not one from the client                             | Confirm with the client                                                                                                                               |
| 10  | Browser tests passed in Chrome and Firefox                                                                                           | The warehouses' browser is not yet confirmed                                           | Confirm with Tenso                                                                                                                                    |
| 11  | One browser test failed once in four full runs and passed in later runs                                                              | Possible timing issue; the test name was not recorded                                  | Watch for it, and record the name if it returns                                                                                                       |
| 12  | No git repository yet, and no deployment                                                                                             | Nothing is deployed                                                                    | See the deployment task (F-7.1)                                                                                                                       |
| 13  | No email notification to tenso approvals when an order is accepted (flow step 4)                                                     | Approvers only see new orders when they open the daily approvals screen                | Backend task, deferred. Needs: approver recipients, sending account (SMTP or email service), per-order or daily summary, language, and a test mailbox |

---

## 6. Notes for developers

- `.npmrc` sets `legacy-peer-deps=true`. `openapi-typescript` expects TypeScript 5, and the project uses TypeScript 6. Recheck this when the tools are updated.
- `src/types/api.ts` is generated. Do not edit it by hand.
- The mock in `vite.mock.ts` only runs in development (`apply: 'serve'`).
- Add new screens to `src/router/index.ts` with a `meta.role` so the guard checks who can open them.
