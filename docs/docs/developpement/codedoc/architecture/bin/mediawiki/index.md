<!-- AUTO-GENERATED: do not edit by hand -->
# Mediawiki

<!-- AUTO-DESC:START -->

This page summarizes the code structure for this directory and its immediate subdirectories. It focuses on the `bin / mediawiki` area within the `bin` module. Use the table of contents below to navigate deeper.

<!-- AUTO-DESC:END -->

## Overview

The **mediawiki** directory contains utilities for **crawling, indexing, and analyzing MediaWiki/Wikipedia content**. These tools extract semantic data from wiki pages and convert it into RDF triples or Elasticsearch indices for knowledge graph integration.

---

## Modules

1. **AAPG..js** — Crawls Wikipedia-style MediaWiki pages to extract hyperlinks and converts them to RDF triples representing relationships between wiki concepts.
2. **mediawikiStats..js** — Generates concept category matrices from SPARQL queries, organizing Wikipedia article categories and their associated subjects for statistical analysis.
3. **mediawikiTagger..js** — Indexes Wikipedia page content into Elasticsearch by extracting text, categories, and metadata from MediaWiki HTML pages for full-text search capabilities.

---

## Features

- **Wiki page crawling** with hyperlink extraction and RDF triple generation.
- **Category-based statistical analysis** via SPARQL queries on indexed wiki data.
- **Elasticsearch indexing** of wiki page content for full-text search and concept matching.

---

## Usage

- These are standalone scripts designed for batch processing of MediaWiki content.
- `AAPG..js` crawls pages and produces RDF triples for import into the triple store.
- `mediawikiTagger..js` indexes page content into Elasticsearch for search integration.
- `mediawikiStats..js` generates statistical reports from already-indexed wiki data.


```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `AAPG..js`
- `mediawikiStats..js`
- `mediawikiTagger..js`

<!-- AUTO-INLINE-FILES:END -->
