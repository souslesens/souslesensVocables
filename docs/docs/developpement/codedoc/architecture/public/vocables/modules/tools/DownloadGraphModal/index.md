<!-- AUTO-GENERATED: do not edit by hand -->
# DownloadGraphModal documentation tool

<!-- AUTO-DESC:START -->

## Overview

This module defines a global object called DownloadGraphModal that provides a simple interface for opening and closing a React-based modal used to download a graph.

## Module

### 1. DownloadGraphModal

It imports a React application from download_graph_modal.js, and retrieves the createApp function from window.DownloadGraphModal.createApp. It then replaces 
window.DownloadGraphModal with a custom object exposing two methods open and close.

## Features

- **open**: Ensures the React app is ready, create a container and call createApp
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

- `DownloadGraphModal.js`

<!-- AUTO-INLINE-FILES:END -->

