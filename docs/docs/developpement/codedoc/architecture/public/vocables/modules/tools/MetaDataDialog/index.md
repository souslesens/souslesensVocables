<!-- AUTO-GENERATED: do not edit by hand -->
# MetaDataDialog documentation tool

<!-- AUTO-DESC:START -->

## Overview

This module creates a global object called MetaDataDialog that provides a simple API to open and close a React-based dialog.

## Module

### 1. MetaDataDialog

It is a small wrapper that allows to open and close a metadata editing dialog implemented in React, ensuring that the dialog is properly mounted and unmounted in the DOM. It createsba global object called MetaDataDialog that provides a simple API to open and close a React-based dialog.bIt imports a module (metadata_dialog.js) which is expected to define window.MetaDataDialog.createApp. The script wraps this createApp function and exposes two methods open and close.

## Features

- **open**: Ensures the React app is ready, creates a container in the page, mount the react app.
- **close**: Unmounts the React app, throws an error if not.

## Usage

- Launch by the module lineage_sources.js
- Creates a container in the page with the ID "mount-edit-metadata-dialog-here".
- Mounts the React application inside that container by calling createApp.
- Passes two props to the React app: sourceName and onClose.
- Unmounts the React application.

<!-- AUTO-DESC:END -->


```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `MetaDataDialog.js`

<!-- AUTO-INLINE-FILES:END -->

