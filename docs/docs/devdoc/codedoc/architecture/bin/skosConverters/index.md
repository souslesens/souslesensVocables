<!-- AUTO-GENERATED: do not edit by hand -->
# SkosConverters

<!-- AUTO-DESC:START -->

This page summarizes the code structure for this directory and its immediate subdirectories. It focuses on the `bin / skosConverters` area within the `bin` module. Use the table of contents below to navigate deeper.

<!-- AUTO-DESC:END -->

## Overview

The **skosConverters** directory contains a collection of **data format converters** that transform various vocabulary and thesaurus formats into SKOS (Simple Knowledge Organization System) RDF. It also includes utilities for indexing SKOS vocabularies into Elasticsearch and for on-the-fly concept tagging.

---

## Modules

### CSV & generic converters

1. **CSVtoSKOS..js** — Converts CSV data to SKOS RDF format by mapping columns to concept properties (URIs, labels, definitions), with support for language tags and field concatenation.

### Domain-specific converters

2. **gaiaToSkos..js** — Transforms GAIA ontology data from tab-separated format to SKOS concepts with proper string sanitization and formatting for RDF output.
3. **quantumToSkos..js** — Generates SKOS RDF from Petroleum Abstracts Thesaurus data, creating concept schemes with prefLabels, altLabels, and broader/related relationships.
4. **termScienceToSkos..js** — Parses TermScience XML format to extract concept definitions, relationships, and language-specific terminology for SKOS RDF conversion.
5. **tulsaToSkos..js** — Parses Tulsa Petroleum Thesaurus text format into structured concept data with top-level concept categories and hierarchical relationships.
6. **xsdToSkos2..js** — Converts XML Schema (XSD) element definitions into SKOS concepts with hierarchical relationships based on complexType and simpleType structures.
7. **RcReportsTriples..js** — Converts maintenance/operational report CSV data into RDF triples, building hierarchical concept taxonomies from report classification fields.

### Indexing & tagging

8. **skosToElastic..js** — Indexes SKOS concept vocabularies into Elasticsearch with ancestor paths and alternative labels for hierarchical faceted search capabilities.
9. **onTheFlyTagger..js** — Tags text documents with semantic concepts from SKOS thesauri in real-time, extracting structured metadata and matching terms against indexed vocabularies.

---

## Features

- **Multi-format input support**: CSV, XML (TermScience), XSD, proprietary text formats (Tulsa, GAIA, Quantum/Petroleum Abstracts).
- **SKOS RDF output** with proper concept schemes, prefLabels, altLabels, definitions, and hierarchical relationships (broader/narrower/related).
- **Language tag support** for multilingual vocabularies.
- **Elasticsearch indexing** with hierarchical ancestor paths for faceted search.
- **Real-time tagging** of text documents against indexed SKOS vocabularies.

---

## Usage

- Converters are run as standalone scripts with input file paths and configuration parameters.
- `CSVtoSKOS..js` is the most general-purpose converter for tabular vocabulary data.
- Domain-specific converters handle proprietary formats from specific thesaurus providers.
- `skosToElastic..js` is run after conversion to index the resulting SKOS data into Elasticsearch for search integration.
- `onTheFlyTagger..js` can be used to annotate text documents against any indexed SKOS vocabulary.


```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `CSVtoSKOS..js`
- `gaiaToSkos..js`
- `onTheFlyTagger..js`
- `quantumToSkos..js`
- `RcReportsTriples..js`
- `skosToElastic..js`
- `termScienceToSkos..js`
- `tulsaToSkos..js`
- `xsdToSkos2..js`

<!-- AUTO-INLINE-FILES:END -->
