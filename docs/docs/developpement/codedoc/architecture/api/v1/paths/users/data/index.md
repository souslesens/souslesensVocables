<!-- AUTO-GENERATED: do not edit by hand -->
# Data

<!-- AUTO-DESC:START -->

## Overview

This directory contains routes related to **user-owned data items** (UserData). It provides endpoints to retrieve or delete a specific UserData entry by its identifier, and includes deeper routes to execute actions attached to a given data item (notably SPARQL query execution).

## Modules

### 1. User data item (`{id}.js`)

This module handles operations on a single UserData entry identified by `id`. It supports retrieving the full entry and deleting it. Delete operations enforce access control: a user can delete the entry only if they own it or if the entry is marked as writable; otherwise the API returns **403 Forbidden**.

### 2. User data execution (`{id}/exec.js`)

This module executes the action associated with a UserData entry. It currently focuses on executing stored **SPARQL queries**: it loads the query from the UserData content, optionally applies templated parameters (e.g., `limit`, `offset`, and custom variables), enforces user-level query filtering, and returns the query result in the requested output format.

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
