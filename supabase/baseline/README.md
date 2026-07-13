# Production schema baseline

This directory contains schema-only snapshots of the linked production Supabase project.
It must not contain customer rows, secrets, or environment-variable values.

These files are reference snapshots, not executable migrations. Do not pass them to
`supabase db push` or apply them to production directly.
