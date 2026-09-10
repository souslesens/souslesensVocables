<!-- AUTO-GENERATED: do not edit by hand -->
# Plugins

<!-- AUTO-DESC:START -->

## Overview

This directory contains administrative routes for managing the platform plugin system. It allows administrators to configure enabled plugins and manage the Git repositories used to fetch and update them.

## Modules

### 1. Plugin configuration (`config.js`)
Provides access to the global plugins configuration. It allows administrators to retrieve the current configuration and update it by saving a new set of plugin definitions. :contentReference[oaicite:0]{index=0}

### 2. Plugin repositories (`repositories.js`)
Provides access to the list of configured plugin repositories. This endpoint returns the repository configuration used by the platform to fetch and manage plugins. :contentReference[oaicite:1]{index=1}

## Contents

- [Repositories](repositories/index.md)

<!-- AUTO-DESC:END -->

```{toctree}
:maxdepth: 5
:caption: Contents

repositories/index
```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `config.js`
- `repositories.js`

<!-- AUTO-INLINE-FILES:END -->
