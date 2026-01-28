<!-- AUTO-GENERATED: do not edit by hand -->
# UploadGraphModal

<!-- AUTO-DESC:START -->

## Overview

This module defines a global UploadGraphModal object that manages opening and closing a React-based modal component.

## Module

### 1. UploadGraphModal

It imports a function called createApp from another module (upload_graph_modal.js).
The script creates an object with two main methods open and close.
Overall, the code provides a small wrapper around a React modal application, allowing the rest of the site to open and close that modal through a simple API.

## Features

- **open**: Ensures the React app is ready.
- **close**: Unmounts the React app if it is currently mounted.

## Usage

- Launch by the bot createSLSVsource_bot
- Creates a <div> in the document body if it doesn’t already exist.
- Mounts the React application inside that div, passing apiUrl, sourceName, and an onClose callback.
- When the modal closes, it first unmounts the React app, then calls the provided onClose handler.
- Unmounts the React app if it is currently mounted; otherwise, it throws an error.

<!-- AUTO-DESC:END -->


```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `UploadGraphModal.js`

<!-- AUTO-INLINE-FILES:END -->

