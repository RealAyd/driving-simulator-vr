# Reuse inventory

Source: index.html blob cbbad015b3dbb5aa891d16d890c57b237fcc3ce7, branch baseline 067d7cd34c748d4a5cb2df1aa0923993cdc33238.

The legacy app remains in index.html. New files are not wired into it and are not a runnable Babylon simulator.

## Ready for adaptation

- src/migration/countries.mjs: extracted country list, aliases, flag helpers and driving defaults. Inherited values are not newly verified. seatX is a legacy model-specific offset, not the new camera contract. makeFlag still uses an external CDN; decide whether to self-host permitted flags.
- src/migration/indicator-audio.mjs: oscillator click extracted behind explicit unlock/click/dispose methods. Caller supplies blink timing, mute/pause and hidden-page handling. Unlock from a user gesture.
- src/migration/share.mjs: injected navigator, explicit result, no DOM/toast coupling. Caller supplies a safe public URL without sensitive query parameters.

## Reference only

- reference/legacy/assessment.mjs preserves the existing pure evaluator and fault ledger. Three-repeat escalation is a strict training heuristic. Timestamp-zero handling, Date.now, blind-check ordering, missing dangerous-fault deduplication and contextual severity must be redesigned before production reuse. Do not use as the standard new rubric.
- reference/legacy/observation-components.js preserves mirror dwell and relative shoulder-direction logic. A-Frame/THREE and app globals remain unresolved by design. Use it as reference, not an import. Head direction is not eye tracking.
- reference/legacy/turn-signals.js preserves indicator input/UI/observation sequencing and audio reference. Do not import: renderer, DOM, clock and scoring dependencies require ports.

## Excluded

Google keys/loaders, tiles/Street View renderers, camera synchronisation, hardcoded road altitude, legacy movement and old local junction zones. Existing index.html is retained without copying its key into the migration modules.

## Integration guidance

Use .mjs as a dependency-free extraction staging format; the foundation agent can add TypeScript interfaces after shared contracts are frozen. Migration modules do not establish a second coordinate convention. Only the integration lead should wire them into the new app. Source behaviour is preserved in reference files; historical policy comments are not verification.

Run: node --test tests/migration.test.mjs

These tests check extracted behaviour and adapters, not visual/audio/browser/headset performance. No production deployment is part of this extraction.
