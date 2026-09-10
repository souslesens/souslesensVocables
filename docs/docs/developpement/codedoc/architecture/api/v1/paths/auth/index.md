<!-- AUTO-GENERATED: do not edit by hand -->
# Auth

<!-- AUTO-DESC:START -->

## Overview

This directory contains authentication-related API routes. It provides endpoints to check the current authentication context and to log out the current user. These routes allow clients to determine whether a user is authenticated and to properly terminate a user session.

## Modules

### 1. Session check (`whoami.js`)

This module returns information about the currently authenticated user. It is commonly used by clients to verify login status and retrieve the active user context.

### 2. Logout (`logout.js`)

This module logs out the current user when authentication is enabled. It returns a redirect URL adapted to the configured authentication provider (such as Keycloak, Auth0, or local authentication), allowing the client to complete the logout flow correctly.

<!-- AUTO-DESC:END -->

```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `logout.js`
- `whoami.js`

<!-- AUTO-INLINE-FILES:END -->
