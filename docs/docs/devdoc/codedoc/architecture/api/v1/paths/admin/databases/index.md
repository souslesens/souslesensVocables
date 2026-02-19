<!-- AUTO-GENERATED: do not edit by hand -->
# Databases

<!-- AUTO-DESC:START -->

## Overview

This directory contains administrative routes for managing database configurations and validating database connectivity. All endpoints in this area are restricted to administrators.

## Modules

### 1. Database management (`{id}.js`)
Provides admin operations on a single database identified by `id`. It supports retrieving the database configuration, updating it, and deleting it. Update and delete operations return a success message along with the refreshed list of all configured databases.

### 2. Database connectivity test (`test/{id}.js`)
Tests connectivity to a specific database by opening an admin-restricted connection and running a simple `SELECT 1`. Returns **200** when the remote database is reachable, and returns an error status when connection cannot be established (e.g., unreachable host or invalid credentials).

## Contents

- [Database tests](test/index.md)

<!-- AUTO-DESC:END -->

```{toctree}
:maxdepth: 5
:caption: Contents

test/index
```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `{id}.js`

<!-- AUTO-INLINE-FILES:END -->
