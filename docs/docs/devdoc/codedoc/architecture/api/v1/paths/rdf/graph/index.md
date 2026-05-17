<!-- AUTO-GENERATED: do not edit by hand -->
# Graph

<!-- AUTO-DESC:START -->

## Overview

Read-only and patch endpoints for graph-level metadata, used by the UI before/while displaying a source's content.

## Modules

### 1. `info.js`
Returns `{ graph, graphSize }` after a single `COUNT(*)` SPARQL query. Aggregates imported graphs when `withImports=true`.

### 2. `metadata.js`
- `GET` returns metadata-level triples (`dc:title`, `dc:creator`, `owl:imports`, version annotations) of the source's graph.
- `POST` applies a delta: `addedData` triples are inserted, `removedData` triples are deleted.

<!-- AUTO-DESC:END -->

```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `info.js`
- `metadata.js`

<!-- AUTO-INLINE-FILES:END -->
