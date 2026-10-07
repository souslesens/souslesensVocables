<!-- AUTO-GENERATED: do not edit by hand -->
# Axioms

<!-- AUTO-DESC:START -->

This page summarizes the code structure for this directory and its immediate subdirectories. It focuses on the `bin / axioms` area within the `bin` module. Use the table of contents below to navigate deeper.

<!-- AUTO-DESC:END -->

## Overview

The **axioms** directory contains the **OWL axiom processing pipeline** for parsing, validating, and converting Manchester Syntax expressions into RDF triples. It provides:

- ANTLR4-based parsing and validation of OWL Manchester Syntax
- Auto-suggestion of ontology classes and properties during expression editing
- Conversion of parsed axiom expressions into RDF triple sets for SPARQL insertion

---

## Modules

1. **axiomExtractor.js** — Converts OWL axiom text expressions into RDF triples by parsing Manchester syntax using XML-like representations and handling complex restriction patterns (cardinality, existential/universal quantification).
2. **manchesterSyntaxEngine.js** — Provides ANTLR4-based parsing and validation of OWL Manchester syntax axioms, with auto-suggestion capabilities via the antlr4-autosuggest library for interactive editing.

---

## Features

- **Manchester Syntax parsing** using ANTLR4 grammar with full OWL 2 keyword support (and, or, some, only, exactly, min, max, etc.).
- **Auto-suggestion** of valid next tokens during axiom editing for guided expression construction.
- **Triple extraction** from parsed axiom expressions, generating blank nodes for restrictions and proper OWL triples.
- **Restriction support** including existential (`some`), universal (`only`), and cardinality (`exactly`, `min`, `max`) restrictions.

---

## Usage

- `manchesterSyntaxEngine.js` is used by the frontend ManchesterSyntaxWidget to validate expressions and provide auto-completion suggestions.
- `axiomExtractor.js` converts validated expressions into RDF triples for insertion into the triple store.
- The ANTLR4 grammar and generated parser/lexer files are in the `manchesterSyntax/` subdirectory.


```{toctree}
:maxdepth: 5
:caption: Contents

manchesterSyntax/index
```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `axiomExtractor.js`
- `manchesterSyntaxEngine.js`

<!-- AUTO-INLINE-FILES:END -->
