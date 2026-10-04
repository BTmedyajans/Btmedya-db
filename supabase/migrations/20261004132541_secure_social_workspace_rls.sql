-- BTMEDYA Supabase social schema RLS hardening
-- Production migration: 20261004132541_secure_social_workspace_rls
-- This is PostgreSQL/Supabase only. Cloudflare D1 migrations stay in /migrations.

create table if not exists social.workspace_members (
  workspace_id uuid not null references social.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer'
    check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_id_idx
  on social.workspace_members(user_id);

create index if not exists workspace_members_workspace_id_idx
  on social.workspace_members(workspace_id);

alter table social.workspace_members enable row level security;

revoke all on social.workspace_members from anon;
revoke all on social.workspace_members from authenticated;
grant select on social.workspace_members to authenticated;
grant all on social.workspace_members to service_role;

grant usage on schema social to authenticated, service_role;
grant select, insert, update, delete on
  social.workspaces,
  social.accounts,
  social.content_items,
  social.publication_queue,
  social.publication_logs
to authenticated;
grant all on
  social.workspaces,
  social.accounts,
  social.content_items,
  social.publication_queue,
  social.publication_logs
to service_role;
grant usage, select on sequence social.publication_logs_id_seq to service_role;

alter table social.workspaces enable row level security;
alter table social.accounts enable row level security;
alter table social.content_items enable row level security;
alter table social.publication_queue enable row level security;
alter table social.publication_logs enable row level security;

drop policy if exists "members can view workspace" on social.workspaces;
create policy "members can view workspace"
on social.workspaces for select to authenticated
using (exists (
  select 1 from social.workspace_members wm
  where wm.workspace_id = workspaces.id
    and wm.user_id = (select auth.uid())
));

drop policy if exists "owners can update workspace" on social.workspaces;
create policy "owners can update workspace"
on social.workspaces for update to authenticated
using (exists (
  select 1 from social.workspace_members wm
  where wm.workspace_id = workspaces.id
    and wm.user_id = (select auth.uid())
    and wm.role = 'owner'
))
with check (exists (
  select 1 from social.workspace_members wm
  where wm.workspace_id = workspaces.id
    and wm.user_id = (select auth.uid())
    and wm.role = 'owner'
));

drop policy if exists "owners can delete workspace" on social.workspaces;
create policy "owners can delete workspace"
on social.workspaces for delete to authenticated
using (exists (
  select 1 from social.workspace_members wm
  where wm.workspace_id = workspaces.id
    and wm.user_id = (select auth.uid())
    and wm.role = 'owner'
));

drop policy if exists "members can view own memberships" on social.workspace_members;
create policy "members can view own memberships"
on social.workspace_members for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "members can view accounts" on social.accounts;
create policy "members can view accounts"
on social.accounts for select to authenticated
using (exists (
  select 1 from social.workspace_members wm
  where wm.workspace_id = accounts.workspace_id
    and wm.user_id = (select auth.uid())
));

drop policy if exists "editors can insert accounts" on social.accounts;
create policy "editors can insert accounts"
on social.accounts for insert to authenticated
with check (exists (
  select 1 from social.workspace_members wm
  where wm.workspace_id = accounts.workspace_id
    and wm.user_id = (select auth.uid())
    and wm.role in ('owner', 'editor')
));

drop policy if exists "editors can update accounts" on social.accounts;
create policy "editors can update accounts"
on social.accounts for update to authenticated
using (exists (
  select 1 from social.workspace_members wm
  where wm.workspace_id = accounts.workspace_id
    and wm.user_id = (select auth.uid())
    and wm.role in ('owner', 'editor')
))
with check (exists (
  select 1 from social.workspace_members wm
  where wm.workspace_id = accounts.workspace_id
    and wm.user_id = (select auth.uid())
    and wm.role in ('owner', 'editor')
));

drop policy if exists "editors can delete accounts" on social.accounts;
create policy "editors can delete accounts"
on social.accounts for delete to authenticated
using (exists (
  select 1 from social.workspace_members wm
  where wm.workspace_id = accounts.workspace_id
    and wm.user_id = (select auth.uid())
    and wm.role in ('owner', 'editor')
));

drop policy if exists "members can view content" on social.content_items;
create policy "members can view content"
on social.content_items for select to authenticated
using (exists (
  select 1 from social.workspace_members wm
  where wm.workspace_id = content_items.workspace_id
    and wm.user_id = (select auth.uid())
));

drop policy if exists "editors can insert content" on social.content_items;
create policy "editors can insert content"
on social.content_items for insert to authenticated
with check (exists (
  select 1 from social.workspace_members wm
  where wm.workspace_id = content_items.workspace_id
    and wm.user_id = (select auth.uid())
    and wm.role in ('owner', 'editor')
));

drop policy if exists "editors can update content" on social.content_items;
create policy "editors can update content"
on social.content_items for update to authenticated
using (exists (
  select 1 from social.workspace_members wm
  where wm.workspace_id = content_items.workspace_id
    and wm.user_id = (select auth.uid())
    and wm.role in ('owner', 'editor')
))
with check (exists (
  select 1 from social.workspace_members wm
  where wm.workspace_id = content_items.workspace_id
    and wm.user_id = (select auth.uid())
    and wm.role in ('owner', 'editor')
));

drop policy if exists "editors can delete content" on social.content_items;
create policy "editors can delete content"
on social.content_items for delete to authenticated
using (exists (
  select 1 from social.workspace_members wm
  where wm.workspace_id = content_items.workspace_id
    and wm.user_id = (select auth.uid())
    and wm.role in ('owner', 'editor')
));

drop policy if exists "members can view queue" on social.publication_queue;
create policy "members can view queue"
on social.publication_queue for select to authenticated
using (exists (
  select 1
  from social.content_items ci
  join social.workspace_members wm on wm.workspace_id = ci.workspace_id
  where ci.id = publication_queue.content_id
    and wm.user_id = (select auth.uid())
));

drop policy if exists "editors can insert queue" on social.publication_queue;
create policy "editors can insert queue"
on social.publication_queue for insert to authenticated
with check (exists (
  select 1
  from social.content_items ci
  join social.workspace_members wm on wm.workspace_id = ci.workspace_id
  join social.accounts a on a.workspace_id = ci.workspace_id
  where ci.id = publication_queue.content_id
    and a.id = publication_queue.account_id
    and wm.user_id = (select auth.uid())
    and wm.role in ('owner', 'editor')
));

drop policy if exists "editors can update queue" on social.publication_queue;
create policy "editors can update queue"
on social.publication_queue for update to authenticated
using (exists (
  select 1
  from social.content_items ci
  join social.workspace_members wm on wm.workspace_id = ci.workspace_id
  join social.accounts a on a.workspace_id = ci.workspace_id
  where ci.id = publication_queue.content_id
    and a.id = publication_queue.account_id
    and wm.user_id = (select auth.uid())
    and wm.role in ('owner', 'editor')
))
with check (exists (
  select 1
  from social.content_items ci
  join social.workspace_members wm on wm.workspace_id = ci.workspace_id
  join social.accounts a on a.workspace_id = ci.workspace_id
  where ci.id = publication_queue.content_id
    and a.id = publication_queue.account_id
    and wm.user_id = (select auth.uid())
    and wm.role in ('owner', 'editor')
));

drop policy if exists "editors can delete queue" on social.publication_queue;
create policy "editors can delete queue"
on social.publication_queue for delete to authenticated
using (exists (
  select 1
  from social.content_items ci
  join social.workspace_members wm on wm.workspace_id = ci.workspace_id
  where ci.id = publication_queue.content_id
    and wm.user_id = (select auth.uid())
    and wm.role in ('owner', 'editor')
));

drop policy if exists "members can view publication logs" on social.publication_logs;
create policy "members can view publication logs"
on social.publication_logs for select to authenticated
using (exists (
  select 1
  from social.publication_queue pq
  join social.content_items ci on ci.id = pq.content_id
  join social.workspace_members wm on wm.workspace_id = ci.workspace_id
  where pq.id = publication_logs.queue_id
    and wm.user_id = (select auth.uid())
));

revoke insert, update, delete on social.publication_logs from authenticated;
revoke insert on social.workspaces from authenticated;
