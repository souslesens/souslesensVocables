<!-- AUTO-GENERATED: do not edit by hand -->
# Users

<!-- AUTO-DESC:START -->

## Overview

The `users` module provides all API routes related to user identity, user-specific data, and personal configuration. It defines how clients interact with the currently authenticated user, access or manage user information, and store or retrieve data associated with a user.

This module is central to the API, as most interactions depend on the user context, permissions, and user-owned resources.

## Modules

### 1. User identity (`me.js`)
Returns information about the currently authenticated user. When authentication is disabled, a default admin-like user profile is returned. Sensitive fields are removed before the response is sent.

### 2. Authentication tokens (`token.js`)
Generates or updates a user authentication token based on the provided login. The generated token is returned in the response and can be used for subsequent API calls.

### 3. User preferences (`theme.js`)
Retrieves the user interface theme associated with the current user’s profile. The theme is resolved from the user’s primary group and returned as a simple value.

### 4. User data management (`data.js`)
Manages user-owned data entries. Provides endpoints to list, create, and update user data, with filtering options and ownership-based access control.

### 5. User-specific operations (`{id}.js`)
Provides administrative operations on a specific user identified by an ID. Supports retrieving and deleting user accounts and is restricted to admin users.

## Contents

- [User data](data/index.md)

<!-- AUTO-DESC:END -->


```{toctree}
:maxdepth: 5
:caption: Contents

data/index
