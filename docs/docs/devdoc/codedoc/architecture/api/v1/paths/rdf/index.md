<!-- AUTO-GENERATED: do not edit by hand -->
# Rdf

<!-- AUTO-DESC:START -->

## Overview

CRUD operations on the RDF named graphs attached to sources. These routes are the high-level entry points used by the UI to upload, download, move, or describe a source's graph in the configured triplestore.

Access control is delegated to the source layer: the caller must own (or have `readwrite` on) the source whose graph is being mutated. Read-only routes accept any source visible to the caller via `getUserSources`.

## Modules

### 1. Graph payload (`graph.js`)
- `GET` paginates the N-Triples content of a source's graph (with optional inclusion of imported graphs).
- `POST` accepts chunked multipart uploads (TTL/RDF-XML/OWL/...) and loads the file into the triplestore.
- `DELETE` drops the graph attached to a source (does not remove the source descriptor itself).

### 2. Remote loading (`graphUrl.js`)
Fetches an RDF file from a public URL, persists it under `data/uploaded_rdf_data/` and loads it into the source's graph.

### 3. Graph relocation (`graphMove.js`)
Atomically copies all triples from `sourceGraphUri` to `targetGraphUri` and clears the original. Used to rename a graph URI without losing data.

### 4. Graph metadata (`graph/info.js`, `graph/metadata.js`)
Lightweight `COUNT(*)` and metadata-triple endpoints that feed the UI before a full download (size estimation, title/version display, edition of `dc:title`, `owl:imports`, ...).

<!-- AUTO-DESC:END -->

```{toctree}
:maxdepth: 5
:caption: Contents

graph/index
```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `graph.js`
- `graphUrl.js`

<!-- AUTO-INLINE-FILES:END -->
