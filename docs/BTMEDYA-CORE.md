# BTMEDYA Core

BTMEDYA Core is the Cloudflare-native operating layer for the agency.

## Architecture

- Cloudflare Worker: API/orchestration
- D1: operational state, content, publication queue, events
- R2: media objects
- KV: cache, rate limits and lightweight operational state
- Workflows / Durable Objects: durable approval and long-running processes already present in the Worker
- GitHub: source of truth, review and deployment pipeline

External products are optional adapters, not system-of-record components.

## Core tables

- bt_core_workspaces
- bt_core_users
- bt_core_content
- bt_core_publications
- bt_core_events

The tables are created idempotently by the Worker so the first rollout does not require a destructive migration.

## Admin API

Authenticated routes:

- GET /api/admin/core — core readiness and counters
- POST /api/admin/core/bootstrap — creates the initial BTMEDYA workspace once

The existing Agency OS displays this status and provides the bootstrap action.

## Operating rule

Content follows: draft → approval → queue → publish → event/log → analytics

Existing social publishing remains approval-driven. Existing Metricool support is retained as a provider adapter while the native BTMEDYA publication model becomes the system of record.

## Rollout

1. Merge the Core foundation.
2. Let the existing GitHub → Cloudflare production verification pipeline validate the source.
3. Open Agency OS and run “BTMEDYA Core'u başlat” once.
4. Add native platform adapters one network at a time.
5. Move analytics ingestion into D1.
6. Only then consider removing external provider dependencies.

No existing D1/R2 tables are deleted by this foundation.
