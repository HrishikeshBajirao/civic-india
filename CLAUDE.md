@AGENTS.md
@AGENTS.md

# Civic India

Civic India helps people follow Indian public institutions and understand what has changed, with links back to the official source.

## Product principles

- Keep the original source, issuer, language, and available publication and retrieval times visible.
- Preserve source provenance; treat an official publication as evidence of what was published, not an independent fact check.
- Keep source documents distinct from real-world events; connect them only when there is clear evidence.

## Project references

- `README.md` describes the implemented app and how to run it.
- `docs/architecture/v0.1-system-design.md` describes proposed product and architecture direction. It is a draft; flag conflicts with the current code or README.
- `docs/architecture/rss-feed-audit.md` tracks source and connector findings.
- Read the relevant design docs before making product or architecture changes.

## Working rules

- Check `git status` and the existing diff before editing; preserve current work.
- Ask before running ingestion, applying database changes, or changing schema.
- Never print or commit secrets from `.env`.