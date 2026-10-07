<!-- AUTO-GENERATED: do not edit by hand -->
# Sources

<!-- AUTO-DESC:START -->

## Overview

This directory contains administrative routes for managing individual data sources. These endpoints allow administrators to retrieve, update, delete, and configure sources, as well as manage relationships between sources such as imports.

## Modules

### 1. Source management (`{id}.js`)
Provides administrative operations on a specific source identified by `id`. It supports retrieving the source configuration, updating it, or deleting it. Update and delete operations return a confirmation message along with the refreshed list of all available sources.

### 2. Source imports (`{id}/imports.js`)
Allows adding an import relationship to a given source. This endpoint links another source as an imported dependency, enabling source composition or reuse.

## Contents

- [Source imports](./{id}/index.md)

<!-- AUTO-DESC:END -->

```{toctree}
:maxdepth: 5
:caption: Contents

{id}/index
```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `{id}.js`

<!-- AUTO-INLINE-FILES:END -->
