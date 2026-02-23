<!-- AUTO-GENERATED: do not edit by hand -->
# Users

<!-- AUTO-DESC:START -->

## Overview

This directory contains administrative routes for managing user accounts. These endpoints are restricted to administrators and allow operations targeting a specific user by identifier.

## Modules

### 1. User account administration (`{id}.js`)
Provides admin operations on a single user account identified by `id`. It supports retrieving user account details and deleting a user account. When a user is deleted successfully, the endpoint returns a confirmation message along with the refreshed list of user accounts; if the user does not exist, it returns **404 Not Found**.

<!-- AUTO-DESC:END -->

```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `{id}.js`

<!-- AUTO-INLINE-FILES:END -->
