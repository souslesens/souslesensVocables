<!-- AUTO-GENERATED: do not edit by hand -->
# Annotator

<!-- AUTO-DESC:START -->

This page summarizes the code structure for this directory and its immediate subdirectories. It focuses on the `bin / annotator` area within the `bin` module. Use the table of contents below to navigate deeper.

<!-- AUTO-DESC:END -->

## Overview

The **annotator** directory contains the **document annotation pipeline** for extracting semantic concepts from document files. It processes various file formats (PDF, DOCX, etc.) by extracting their text content via Apache Tika, then annotates the text by matching terms against SPARQL-indexed ontology concepts.

---

## Modules

1. **dirContentAnnotator..js** — Handles the document annotation pipeline by extracting content from various file formats (PDF, DOCX, etc.), processing them with Apache Tika, and managing parsed documents in a directory structure with socket-based progress communication.

---

## Features

- **Multi-format document parsing** via Apache Tika (PDF, DOCX, HTML, etc.).
- **Directory-based batch processing** of multiple documents.
- **Socket-based progress reporting** for real-time feedback during annotation.
- **Structured output management** with parsed documents stored in directory hierarchies.

---

## Usage

- The annotator is invoked via the frontend Annotator tool.
- `dirContentAnnotator..js` receives a directory path, extracts text from each document file, and annotates it against the configured ontology sources.
- Progress is communicated back to the client via WebSocket.


```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `dirContentAnnotator..js`

<!-- AUTO-INLINE-FILES:END -->
