<!-- AUTO-GENERATED: do not edit by hand -->
# EditSourceDialog documentation tool

<!-- AUTO-DESC:START -->

## Overview

This module creates a global EditSourceDialog object that manages the lifecycle of a React-based dialog used to edit a data source.

## Module

### 1. EditSourceDialog

It imports a React application from edit_source_dialog.js and retrieves the createApp function from window.EditSourceDialog.createApp.
It then redefines window.EditSourceDialog as an object exposing two methods: open and close. This code is a small wrapper that allows the rest of the application to easily open and close a React “edit source” dialog, ensuring correct mounting and unmounting in the DOM.

## Features

- **open**: Check the React app is ready, create a container in the DOM and call createApp
- **close**: Unmounts the React app.

## Usage

- Called by the lineage_sources
- Check that the React app is ready
- Creates a container in the document body.
- Calls createApp to mount the React modal into that container
- Unmounts the React app if it is currently mounted; otherwise, it throws an error.

<!-- AUTO-DESC:END -->


```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `EditSourceDialog.js`

<!-- AUTO-INLINE-FILES:END -->

