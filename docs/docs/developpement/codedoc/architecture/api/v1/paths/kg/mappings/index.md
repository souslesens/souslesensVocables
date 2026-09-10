<!-- AUTO-GENERATED: do not edit by hand -->
# Mappings

<!-- AUTO-DESC:START -->

## Overview

Persistence and lifecycle of KG mapping documents. Mappings describe how rows from a CSV/SQL source map to RDF triples; this folder hosts retrieval and bulk-rebuild routes around the documents saved by `POST /kg/mappings`.

## Modules

### 1. Single mapping (`{name}.js`)
Returns the mapping document identified by `name` (`KGcontroller.getMappings`).

### 2. Mapping inventory (`mappingfiles.js`)
Lists the mapping files that have already produced triples in a source's graph. Powers the "recreate triples" / "delete triples" actions of the UI.

### 3. Bulk rebuild (`recreateTriples.js`)
Deletes and recreates KGBuilder triples for a source, either for all tables or a subset. Already includes detailed Swagger documentation; left mostly untouched.

<!-- AUTO-DESC:END -->

```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `mappingfiles.js`
- `recreateTriples.js`
- `{name}.js`

<!-- AUTO-INLINE-FILES:END -->
