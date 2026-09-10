<!-- AUTO-GENERATED: do not edit by hand -->
# GraphStore

<!-- AUTO-DESC:START -->

## Overview

Lower-level triplestore operations bypassing the source layer. Most routes are admin-only and operate on raw `graphUri` values rather than source names — used during ontology onboarding and bulk import.

## Modules

### 1. Graph export and import (`graph.js`)
- `GET` exports the named graph identified by `graphUri` as Turtle (`GraphStore.exportGraph`).
- `POST` (admin-only) imports an RDF file from a public URL into a named graph.

### 2. Source onboarding (`importSource.js`)
Admin-only orchestration: registers a new `sourceName → graphUri` entry, optionally clears the existing graph, then loads triples from `rdfUrl`. The single entry point used to bootstrap a new ontology source from scratch.

<!-- AUTO-DESC:END -->

```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `graph.js`
- `importSource.js`

<!-- AUTO-INLINE-FILES:END -->
