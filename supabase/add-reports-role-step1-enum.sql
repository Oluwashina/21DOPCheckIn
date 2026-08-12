-- STEP 1 of 2 — run this alone first, then run step 2.
-- PostgreSQL must commit the new enum value before it can be used in functions/policies.

alter type user_role add value if not exists 'reports';
