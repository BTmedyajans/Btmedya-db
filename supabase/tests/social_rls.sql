begin;

select plan(12);

select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='social' and c.relname='workspaces'),'RLS enabled on social.workspaces');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='social' and c.relname='accounts'),'RLS enabled on social.accounts');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='social' and c.relname='content_items'),'RLS enabled on social.content_items');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='social' and c.relname='publication_queue'),'RLS enabled on social.publication_queue');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='social' and c.relname='publication_logs'),'RLS enabled on social.publication_logs');

select ok(has_table_privilege('anon','social.workspaces','SELECT') = false,'anon cannot SELECT workspaces');
select ok(has_table_privilege('anon','social.accounts','SELECT') = false,'anon cannot SELECT accounts');
select ok(has_table_privilege('authenticated','social.publication_logs','INSERT') = false,'authenticated cannot INSERT publication logs');
select ok(has_table_privilege('authenticated','social.workspaces','INSERT') = false,'authenticated cannot INSERT workspaces');

select ok((select count(*) from pg_policies where schemaname='social' and tablename='workspace_members') >= 1,
  'workspace_members has a policy');
select ok((select count(*) from pg_policies where schemaname='social' and tablename='publication_logs' and cmd='SELECT') = 1,
  'publication_logs has one SELECT policy');
select ok((select count(*) from pg_policies where schemaname='social' and tablename='publication_queue' and cmd='UPDATE') = 1,
  'publication_queue has one UPDATE policy');

select * from finish();
rollback;
