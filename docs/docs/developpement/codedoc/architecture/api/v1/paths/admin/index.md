<!-- AUTO-GENERATED: do not edit by hand -->
# Admin

<!-- AUTO-DESC:START -->

## Overview

This directory contains administrative API routes used to manage platform-wide resources. These endpoints are restricted to administrators and provide system-level operations for users, sources, profiles, databases, plugins, and tools.

Routes in this folder generally expose collection-level operations (list/create/update), while deeper subdirectories provide resource-level endpoints (e.g., operations on a specific `{id}`).

## Modules

### 1. Administrative tools inventory (`all-tools.js`)
Returns the complete list of existing tools, including tools that are not currently enabled or exposed. This endpoint is useful for administrators to inspect the full tool catalog known by the platform.

### 2. Databases collection (`databases.js`)
Lists all configured databases and allows administrators to add a new database to the configuration. After creation, it returns the updated list of databases.

### 3. Plugins catalog (`plugins.js`)
Returns the list of available plugins as exposed by the platform tooling layer. This is an admin-only view used to inspect what plugins are available.

### 4. Profiles collection (`profiles.js`)
Lists all profiles and allows administrators to create new profiles. Creation supports submitting multiple profile entries in one request and returns the updated profiles list.

### 5. Sources collection (`sources.js`)
Returns sources visible to the current user context and allows creating/updating sources. Source creation enforces rules such as permissions to create sources and limits for non-admin users, and automatically sets ownership/publishing fields when relevant.

### 6. Users collection (`users.js`)
Lists all user accounts and allows administrators to create or update users. Updates/creation reject empty passwords when a password field is provided, and responses include the refreshed user list.

## Contents

- [Databases administration](databases/index.md)
- [Ontology administration](ontology/index.md)
- [Plugin administration](plugins/index.md)
- [Profile administration](profiles/index.md)
- [Source administration](sources/index.md)
- [User administration](users/index.md)

<!-- AUTO-DESC:END -->

```{toctree}
:maxdepth: 5
:caption: Contents

databases/index
ontology/index
plugins/index
profiles/index
sources/index
users/index
```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `all-tools.js`
- `databases.js`
- `plugins.js`
- `profiles.js`
- `sources.js`
- `users.js`

<!-- AUTO-INLINE-FILES:END -->
