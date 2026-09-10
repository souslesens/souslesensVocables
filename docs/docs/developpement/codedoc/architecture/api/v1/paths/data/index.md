<!-- AUTO-GENERATED: do not edit by hand -->
# Data

<!-- AUTO-DESC:START -->

## Overview

Filesystem access endpoints scoped to the configured `dataDir`. Used by MappingModeler and the CSV picker to browse, read, write, and delete files in a sandboxed area of the server.

All sensitive operations sanitize paths to prevent directory traversal, and DELETE on a file checks `readwrite` access on the optional `source` parameter.

## Modules

### 1. Listing (`files.js`)
Lists file names inside `dataDir/<dir>` (`dataController.getFilesList`).

### 2. File CRUD (`file.js`)
- `GET` reads the parsed content of `dataDir/<dir>/<fileName>`.
- `POST` overwrites/creates the file with the body's `data` payload.
- `DELETE` removes the file, with optional `readwrite` check against a source.

### 3. CSV preview (`csv.js`)
Streams the first N lines of a CSV file as JSON rows for quick preview in the UI.

### 4. Directory creation (`dir.js`)
Creates a new sub-directory under `dataDir`.

<!-- AUTO-DESC:END -->

```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `csv.js`
- `dir.js`
- `file.js`
- `files.js`

<!-- AUTO-INLINE-FILES:END -->
