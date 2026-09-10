<!-- AUTO-GENERATED: do not edit by hand -->
# Repositories

<!-- AUTO-DESC:START -->

## Overview

This directory contains administrative routes for managing plugin Git repositories. These endpoints allow administrators to update repositories, inspect available plugins and tags, and manage repository configurations used by the platform.

## Modules

### 1. Repository fetch (`fetch/{id}.js`)
Updates a configured plugin Git repository by fetching its latest changes. It verifies that the repository exists in the configuration and returns a success or error status depending on the update result.

### 2. Repository plugins listing (`plugins/{id}.js`)
Retrieves the list of plugin directories available in a specific repository. This endpoint is used to discover which plugins are present in a repository, including multi-plugin repositories.

### 3. Repository configuration (`repository/{id}.js`)
Manages the configuration of a specific Git repository. It supports updating repository settings and deleting repositories, and ensures the platform configuration is cleaned after changes.

### 4. Repository tags (`tags/{id}.js`)
Retrieves the available Git tags for a given repository. This is typically used to inspect versions or releases exposed by the repository.

## Contents

- [Fetch repository](fetch/index.md)
- [Repository plugins](plugins/index.md)
- [Repository configuration](repository/index.md)
- [Repository tags](tags/index.md)

<!-- AUTO-DESC:END -->

```{toctree}
:maxdepth: 5
:caption: Contents

fetch/index
plugins/index
repository/index
tags/index
```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

_No files in this directory._

<!-- AUTO-INLINE-FILES:END -->
