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
