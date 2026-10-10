# Supabase Social RLS

This directory versions the separate BTMEDYA Supabase social data plane.

The live public site remains Cloudflare Workers + D1 + R2. Do not place these PostgreSQL migrations in the repository's D1 \`migrations/\` directory.

## Production state

Applied migration:

20261004132541_secure_social_workspace_rls

Protected tables:

- social.workspaces
- social.accounts
- social.content_items
- social.publication_queue
- social.publication_logs
- social.workspace_members

## Access model

- anon: no access to social tables.
- authenticated: workspace-scoped access through social.workspace_members.
- owner: workspace administration and social-data management.
- editor: accounts, content and queue management.
- viewer: read-only.
- publication_logs: client read-only; server/Worker writes.
- service_role: server-side access retained.

No membership was seeded automatically. At deployment time Supabase Auth contained zero users, so assigning an owner would have required an unsafe identity assumption.

## Verification

Production checks after the migration:

- RLS enabled on all five requested social tables.
- Unmatched authenticated identity saw zero rows.
- service-role retained access to the existing two workspaces and two accounts.
- Security Advisor returned zero security lints.

Future Supabase schema changes should be version-controlled. The Cloudflare/D1 deployment path is independent of these PostgreSQL migration files.
