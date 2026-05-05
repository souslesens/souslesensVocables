<!-- AUTO-GENERATED: do not edit by hand -->
# Jowl

<!-- AUTO-DESC:START -->

## Overview

Thin proxy in front of the external **JOWL server** (`mainConfig.jowlServer.url`), an OWL-API-based service that handles ontology axioms, Manchester-syntax conversion, and reasoner operations. All routes return `500` when `jowlServer.enabled` is false.

These endpoints back the MappingModeler's axiom editor and the Lineage tool's "axiomatised classes" overlay.

## Modules

### 1. Axiom inspection (`classAxioms.js`, `listClassesWithAxioms.js`, `allAxioms.js`)
Read existing axioms attached to a class (`classAxioms.js`), enumerate classes carrying axioms in a graph (`listClassesWithAxioms.js`), or list every axiom of a graph (`allAxioms.js`). Optional flags expose underlying RDF triples and Manchester-syntax forms.

### 2. Manchester ↔ Triples conversion (`manchesterAxiom2triples.js`, `axiomTriples2manchester.js`)
Compile a Manchester-syntax expression into RDF triples (with optional persistence and consistency check), or render an array of triples as a Manchester string.

### 3. Reasoner operations (`reasoner.js`, `reasonerListInferenceParams.js`, `rules.js`)
Trigger reasoner operations (`classify`, `consistency`, `unsatisfiable`, ...) on a graph or external URL, fetch the supported inference parameters, and manage Jena rule sets.

### 4. Graph ingestion (`importSource.js`, `uploadGraph.js`)
Push a source graph (or a raw upload) to the JOWL server's working memory before reasoning.

<!-- AUTO-DESC:END -->

```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `allAxioms.js`
- `axiomTriples2manchester.js`
- `classAxioms.js`
- `importSource.js`
- `listClassesWithAxioms.js`
- `manchesterAxiom2triples.js`
- `reasoner.js`
- `reasonerListInferenceParams.js`
- `rules.js`
- `uploadGraph.js`

<!-- AUTO-INLINE-FILES:END -->
