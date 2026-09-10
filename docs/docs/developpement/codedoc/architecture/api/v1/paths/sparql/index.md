<!-- AUTO-GENERATED: do not edit by hand -->
# Sparql

<!-- AUTO-DESC:START -->

## Overview

Discovery endpoint for the named graphs accessible to the current user. The heavy SPARQL forwarding work happens at the root level (`sparqlProxy.js`) — this folder only hosts metadata/discovery routes scoped to the SPARQL tag.

## Modules

### 1. Allowed graphs (`graphs.js`)
Returns the intersection between the named graphs present in the triplestore (`rdfDataModel.getGraphs`) and the `graphUri`s of the sources visible to the caller. Used by the SPARQL editor and by Lineage to build their graph pickers.

<!-- AUTO-DESC:END -->

```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `graphs.js`

<!-- AUTO-INLINE-FILES:END -->
