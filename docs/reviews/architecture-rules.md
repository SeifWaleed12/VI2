# Architecture rules and debt list — review handoff

## Who asked and why

Seif, 2026-11-02. He wants all new code to follow Clean Architecture, SOLID and useful design patterns, wants the existing code checked against that, and wants every new session to know the rule.

- Branch: `claude/architecture-rules`
- Base: `full-stack` `1c09174`

## The change

Documentation only. Seif approved editing `AGENTS.md` in his request.

- `AGENTS.md`: new section 4.2 covers where code goes, which patterns to use, size signals, and how to treat existing debt. Sections 4 and 4.1 already required Clean Architecture and SOLID.
- `docs/WORKBOARD.md`: new "Architecture debt" section, AD-1 to AD-10.

## How the assessment was done

- A scratch script walked value imports in `apps/backend/src` and `apps/storefront/src`, 317 files. Type-only imports were skipped. It looked for circular imports, wrong-way dependencies and large routes.
- Flagged files were read by hand.

## Results

- Circular imports: none in either app.
- Backend wrong-way imports: none.
- Storefront wrong-way imports: one, AD-7.
- Unused exports were checked only for the names listed in AD-8. No full dead-code scan was done.

## Not checked

- The four files named at the end of the debt list were not reviewed in depth, and `Navbar.tsx` only by size and imports.
- No code was changed, so no tests were run.
- The size signals in section 4.2 are proposed values, not measured limits.

## Known gaps left alone

`AGENTS.md` still names `claude/work` in section 14 and Meilisearch in section 3, and lists Odoo without saying it is parked. Those are not part of this request.

## Things to look at

1. Does section 4.2 conflict with sections 1, 2 or 4.1?
2. Is any AD item wrong or overstated when checked against the code?
3. AD-2 says the text systems can lose Arabic silently. Confirm that claim.
4. Is any listed pattern a poor fit for Medusa 2.21?

## GPT review, round 1

Reviewed `297df7e` against `1c09174`.

- **P3, AD-10 understates the return routes.** It said six, but all 13 `route.ts` files under `admin/returns` contain the `as never` wrapper.
- No conflict between section 4.2 and sections 1, 2 or 4.1.
- The listed patterns fit Medusa and this codebase.
- AD-2's warning about English-text lookups is supported.

GPT ran no tests and no full dead-code audit.

## Author response

Finding accepted. I confirmed 13 of 13 and corrected AD-10.

## GPT review, round 2

Reviewed `ba2f78c`. The round 1 finding is resolved, with no open findings. GPT ran no tests, as this is documentation only.

Approved. PR open for owner merge.

## Round 3: the debt fixes (code, needs a fresh review)

Seif, 2026-11-02: "fix all of them on pr 33 then we merge". The round 2 approval covered documentation only and does not cover this code.

Review range: `3ee9a11..` the head of `claude/architecture-rules`. 99 files under `apps/`, +3,140 / −6,123 lines.

| Commit | Items |
|---|---|
| `1a7fcd7` | AD-6, AD-7, AD-8 |
| `170f10e` | AD-3, AD-4, AD-5, part of AD-10 (return routes) |
| `0940e68` | AD-1 checkout split |
| `bb970b2` | AD-2 text systems |
| `112b6f8` | AD-9 navbar split |
| last code commit | rest of AD-10, the security test fix, docs |

The workboard's "Architecture debt" table records the result of each item.

### Behavior meant to change

- **Arabic site:**
  - Checkout, account, order confirmation, best sellers, brands, the cart drawer and the error page were translated by rewriting English text in the page. They now use message keys with the same Arabic.
  - Text that showed in English before now has Arabic:
    - placeholders and some labels
    - the delivery option heading
    - the payment notice
    - the "Place order · total" button
  - 39 new Arabic strings were written by Claude. They are marked by `scratchpad/extra.json` and the `checkout.*` keys without old Arabic, and need a native speaker's read.
- **Text that arrives at runtime:**
  - Catalog names, delivery option names and service messages still go through `t()`, now backed by `lib/service-messages.ts`, which keeps the 517 old entries that are not message keys.
  - `LegacyTranslations` and the second dictionary are removed.
- **Popular searches** in search now show their Arabic labels. Before, those labels were only on an unused attribute.

### Behavior meant to stay the same

- **Checkout:** order placement order, refresh recovery, the submission lock, the retry rules, and the production gate (UI and backend).
- **Registration:** the same answers and statuses. Rollback of the login now runs as workflow compensation.
- **Email change:** the same answers, limits, password check and logging.
- **Navbar:** keyboard, hover, Escape and drawer behavior. The account menu now handles its own Escape.

### Verification

- **Backend unit:** 49 suites, 416 tests.
- **Backend integration on a real database:**
  - `sign-in`: 15/15. New test: the login is rolled back when customer creation fails, and the email can register afterwards.
  - `account`: 10/10.
  - `security-stock`: 4/4.
  - `security-boundaries`: 15/15. One test needed `STOREFRONT_URL` set in its own file. It failed the same way on the old email route, so it was not caused by this change.
- **Storefront:** 64 suites, 605 tests. New tests:
  - the submission state machine
  - `detailsProblem`, `orderTotals` and `prepareOrder`
  - Arabic stock labels
- **Type checks and lint:** pass in both apps.
- **Live in a browser (local backend and storefront):**
  - Checkout in English and Arabic: empty and invalid errors, errors clearing on typing, step 2 review, Edit, and right-to-left layout.
  - Arabic pages: home, best sellers, brands, sign-in and create-account.
  - Navbar in Arabic: account menu, category menu, Escape, mobile drawer, brands panel and back.

### Not checked

- No real order was placed. Order placement is covered by the `prepareOrder` and state machine tests, not run end to end.
- Forgot-password, reset-password and order success were not opened in a browser.
- The cart drawer was not opened in Arabic.
- The navbar was not tested on a real phone.
- Other integration suites were not run: checkout, admin-access, catalog and product-reviews.

### Things to look at

1. Does `useOrderPlacement` keep the exact retry semantics: unknown outcome keeps recovery, a refusal drops it, and production refuses before preparing?
2. Does `registerCustomerWorkflow` compensate in every failure case the old route handled? Is keeping the password outside workflow input enough?
3. Did the text codemod turn any data value into a message key? One case in best sellers ("All") was found and fixed.
4. Is any visible English left on the converted screens in Arabic?
5. Do the remaining seven casts in AD-10 really need to stay?
