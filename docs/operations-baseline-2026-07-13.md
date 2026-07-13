# Retailmate operations baseline — 2026-07-13 KST

This document records a read-only production baseline. It contains no customer rows,
secret values, authentication tokens, or database passwords.

## Production hosting

- Vercel scope/project: `hadong-s-ai/retailmate`
- Vercel project ID: `prj_19SHoAoGxjEK84LekDcKcOO4vvsv`
- Current production deployment: `dpl_5m9ask2UEsfobC3pk1d2DSLELbwo`
- Current production URL: `https://retailmate-64u1jkpyh-hadong-s-ai.vercel.app`
- Production aliases: `retailmate.io`, `www.retailmate.io`, `retailmate.vercel.app`
- Region: `icn1`
- Status at inspection: Ready
- Grouped Vercel runtime errors in the preceding 24 hours: 0
- Previous listed production deployment: `https://retailmate-a5h7qv6mu-hadong-s-ai.vercel.app`

Do not use the previous URL as a rollback target without inspecting it again at the
time of rollback. Use Vercel's deployment history and confirm the commit before any
promotion or rollback.

## Environment-variable coverage

Only variable names and environment coverage were inspected; values were not read.

- Production has the application keys currently required by the code: Supabase,
  OpenRouter, Solapi, Kakao, VAPID, cron secret, and app URL.
- Preview has Supabase and shared VAPID/cron keys, but does not currently mirror the
  production OpenRouter, Solapi, Kakao, Solapi test-mode, sender, or app-URL coverage.
- Development does not currently have the Supabase or OpenRouter keys in Vercel.

Preview therefore cannot yet be treated as a full production-parity test environment.
Copying secret values between environments is a separate controlled action and was not
performed during this inspection.

## Production Supabase project

- Project name: `retailmate`
- Project ref: `mdvywgzjxfxlrnjbqmbu`
- Region: Northeast Asia (Seoul)
- CLI link status: linked
- Physical backup mechanism reported: WALG enabled
- Point-in-time recovery reported: disabled
- Returned PITR window: none
- Repository migration directory before this inspection: absent
- Remote migration listing returned no migration rows

A full schema-only dump was attempted but stopped locally because the Supabase CLI
requires Docker for that operation. No database statement was applied and production
was not changed.

## Public schema inventory

All 26 inspected public tables reported RLS enabled:

`account_links`, `ai_images`, `ai_insights`, `ai_usage_logs`, `attendances`,
`audit_logs`, `consent_logs`, `contract_revisions`, `contract_templates`,
`expense_templates`, `expenses`, `labor_contracts`, `notice_reads`, `notices`,
`overtime_requests`, `payrolls`, `phone_verifications`, `products`, `profiles`,
`push_subscriptions`, `sale_items`, `sales`, `store_members`, `stores`,
`user_notification_prefs`, and `work_schedules`.

## Security advisor findings requiring controlled review

No finding below was changed during this inspection.

1. `avatars` is public and has a broad object SELECT policy, allowing file listing.
2. `account_links` and `overtime_requests` have RLS enabled but no policies. The code
   currently uses privileged server paths for these tables; confirm that direct client
   access is intentionally denied before adding any policy.
3. The following SECURITY DEFINER functions are executable more broadly than the
   advisor recommends: `block_staff_store_creation`, `can_view_member_profile`,
   `delete_my_account`, `handle_new_user`, `is_store_admin`, `is_store_member`, and
   `is_store_owner`.
4. The inspected authorization helpers use `auth.uid()` checks. The account-deletion
   function also rejects a null user ID. These checks reduce immediate anonymous risk,
   but PUBLIC/anon EXECUTE grants should still be narrowed in a tested migration.
5. `block_staff_store_creation` and `handle_new_user` are trigger functions. Their
   direct grants must be changed without breaking their triggers.
6. Leaked-password protection is disabled in Supabase Auth.
7. The performance advisor reported repeated per-row auth function evaluation and
   multiple permissive policies. These are performance/maintainability items and must
   not be mixed into the first security migration.

## Application observations

- Twenty-one authenticated production routes opened without redirect, visible error
  alert, or desktop horizontal overflow.
- Browser console warnings repeatedly reported a chart container width/height of `-1`
  on dashboard/chart pages.
- Contract signing performs several privileged writes before and after the final
  contract status change and generates the PDF afterward. It is not a single database
  transaction.
- Payroll reflection writes into `expenses`, which then changes dashboard and report
  totals.
- The daily cron mutates stale open attendance rows before sending notifications.
- AI image generation uses a background `after()` task and can leave pending rows if
  execution is interrupted.

## Change gates

Before changing contracts, attendance, payroll, auth, or RLS:

1. Bring Preview environment-variable coverage to the minimum needed for the flow
   being tested. Use test credentials and test mode where supported.
2. Create non-production test-store fixtures with no copied customer PII.
3. Capture a complete schema-only baseline when Docker or an approved pg_dump path is
   available.
4. Prepare one additive migration at a time and test owner, manager, employee, and
   anonymous access separately.
5. Do not combine permission changes, transaction refactors, cron changes, and UI work
   in one deployment.
6. Confirm the current deployment and rollback candidate immediately before release.
7. Observe Vercel runtime errors and data invariants after 15, 30, and 60 minutes.
