# Hostless staging feedback — 2026-10-23

- REST project lookup and database creation succeeded using the existing Codex
  network secret. Mongo dp-sim-staging reached RUNNING / HEALTHY with 2 GiB.
- Public docs do not describe static Sites path proxy/cache overrides. Staging
  uses an app that serves static files and the API on one origin instead.
- MCP databases_create lacks resource/storage fields, so REST was used to
  request explicit storage capacity and compute at creation.
- GitHub environment secret listing is unavailable to the integration (HTTP
  403: Resource not accessible by integration). Actions can consume environment
  secrets; the new workflow checks their presence without displaying values.
- The linked GitHub environment is github-pages, despite hosting Hostless keys.
  Its main-only branch policy is preserved; manual workflow runs from main.
- No existing DriveTest backend/database, experimental tiles deployment or
  production DNS records were modified.
