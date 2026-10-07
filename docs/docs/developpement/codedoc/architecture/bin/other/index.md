<!-- AUTO-GENERATED: do not edit by hand -->
# Other

<!-- AUTO-DESC:START -->

This page summarizes the code structure for this directory and its immediate subdirectories. It focuses on the `bin / other` area within the `bin` module. Use the table of contents below to navigate deeper.

<!-- AUTO-DESC:END -->

## Overview

The **other** directory contains **miscellaneous standalone scripts** for specialized data conversion and processing tasks. These are generally one-off or project-specific utilities.

---

## Modules

1. **convertPolyLinesToGeometry.js** — Converts polyline coordinate sequences from JSON storage into SQL Server GEOMETRY LINESTRING format for spatial intersection queries.
2. **entityLinking_gaia..js** — Performs entity and relation linking on text documents by parsing structured entity/relation data and building maps for knowledge graph creation.
3. **userArrayToJson.js** — Simple CSV-to-JSON converter that transforms user list data from tab-separated format into structured user objects with credentials and permissions.
4. **validationXDB..js** — Processes validation CSV data by pivoting entity-status pairs from wide to long format for analysis and import into knowledge graphs.

---

## Usage

- These scripts are meant to be run standalone for specific data conversion tasks.
- They do not integrate directly into the main application workflow.


```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `convertPolyLinesToGeometry.js`
- `entityLinking_gaia..js`
- `userArrayToJson.js`
- `validationXDB..js`

<!-- AUTO-INLINE-FILES:END -->
