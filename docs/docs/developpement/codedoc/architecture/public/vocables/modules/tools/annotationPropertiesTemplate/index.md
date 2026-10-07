<!-- AUTO-GENERATED: do not edit by hand -->
# annotation properties template tool documentation

<!-- AUTO-DESC:START -->

## Overview

This module defines a toolset for managing **Annotation Properties Templates** within the application.
It covers the full lifecycle: **template creation**, **template assignment** (to sources/users/profiles), **admin inspection**, and **runtime resolution** to automatically apply placeholder annotation triples during resource creation.

## Module

### 1. annotationPropertiesTemplate

It provides all tools required to create, assign, inspect, and apply annotation properties templates.
This module manages:
templates stored in `/users/data` as `annotationPropertiesTemplate`,
template assignments stored as `annotationPropertiesTemplateAssignment`,
an active assignment strategy (“latest wins”),
and a runtime resolver that computes the union of applicable templates for the current context (source + user + profiles).

## Features

- **Template creation (bot)**: Build a template by selecting vocabularies and annotation properties, deduplicate selections, and save as user data (`annotationPropertiesTemplate`).
- **Template assignment (bot)**: Assign a template to a **source**, **user**, or **profile**, detect an existing active assignment, and offer actions (keep / replace / add / remove / cancel).
- **No-history assignments**: Keep only the newest assignment per target by deleting previous assignments (active = highest id).
- **Admin assignments manager**: List (active) assignments, view template details, and delete assignments from a dialog-based UI.
- **Runtime resolver (union rule)**: Compute applicable templates for the current context by union of:
  source active assignment + user active assignment + each profile/group active assignment.
- **Placeholder insertion**: Insert one triple per template property with the placeholder literal value `"?"` on the created resource.
- **TTL caching + invalidation**: Use a short TTL cache for assignments list/details and provide `clearCache()` for invalidation after updates.

## Usage

- Create templates from the Admin menu using the creation bot, selecting properties from vocabularies and saving them as user data.
- Assign templates to targets (source/user/profile) using the assignment bot; existing assignments are handled via a guided action menu.
- Use the admin assignments manager to inspect current assignments, view template content, and delete obsolete assignments.
- During resource creation, rely on the resolver to compute the applicable template set and insert placeholder annotation triples automatically.

<!-- AUTO-DESC:END -->


```{toctree}
:maxdepth: 5
:caption: Contents

