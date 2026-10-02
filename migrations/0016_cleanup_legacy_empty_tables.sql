-- BTMEDYA production cleanup
-- These tables are empty in production and have no runtime references in the canonical Worker.
-- Do not drop active content tables here.
DROP TABLE IF EXISTS ai_audit;
DROP TABLE IF EXISTS ai_settings;
DROP TABLE IF EXISTS app_users;
DROP TABLE IF EXISTS auth_magic_links;
DROP TABLE IF EXISTS auth_sessions;
DROP TABLE IF EXISTS client_memberships;
DROP TABLE IF EXISTS portfolio;
DROP TABLE IF EXISTS services;
