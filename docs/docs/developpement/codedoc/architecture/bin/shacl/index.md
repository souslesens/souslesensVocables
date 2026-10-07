<!-- AUTO-GENERATED: do not edit by hand -->
# Shacl

<!-- AUTO-DESC:START -->

This page summarizes the code structure for this directory and its immediate subdirectories. It focuses on the `bin / shacl` area within the `bin` module. Use the table of contents below to navigate deeper.

<!-- AUTO-DESC:END -->

## Overview

The **shacl** directory contains the **SHACL (Shapes Constraint Language) validation** module. It validates RDF data against SHACL shape definitions to ensure data quality and conformance to defined schemas.

---

## Modules

1. **validator.mjs** — ES6 module that validates RDF triples against SHACL shape definitions using the `rdf-validate-shacl` library, generating conformance reports with violation details.

---

## Features

- **SHACL validation** of RDF graphs against shape definitions.
- **Conformance reporting** with detailed violation information (focus node, path, severity, message).
- **ES6 module** format (`.mjs`) for modern Node.js import support.

---

## Usage

- The validator is called from Express route handlers when the user triggers SHACL validation from the frontend.
- It receives RDF data and SHACL shapes, runs validation, and returns a conformance report.


```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `validator.mjs`

<!-- AUTO-INLINE-FILES:END -->
