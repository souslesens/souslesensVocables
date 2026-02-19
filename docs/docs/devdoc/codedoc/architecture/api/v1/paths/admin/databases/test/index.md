<!-- AUTO-GENERATED: do not edit by hand -->
# Test

<!-- AUTO-DESC:START -->

## Overview

This directory contains administrative routes used to test database connectivity. These endpoints allow administrators to verify that a configured database is reachable and correctly set up before being used by the platform.

## Modules

### 1. Database test (`{id}.js`)
Tests the connection to a specific database identified by `id`. It attempts to open an admin-restricted connection and executes a simple `SELECT 1` query. The endpoint returns **200** when the database is reachable, or an error status if the connection fails due to network or credential issues.

<!-- AUTO-DESC:END -->

```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `{id}.js`

<!-- AUTO-INLINE-FILES:END -->
