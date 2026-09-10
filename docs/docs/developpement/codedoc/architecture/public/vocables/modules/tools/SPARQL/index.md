<!-- AUTO-GENERATED: do not edit by hand -->
# SPARQL documentation tool

<!-- AUTO-DESC:START -->

## Overview

It provides a small controller to open a dialog that hosts a SPARQL editor and wire it to your backend proxy endpoint, so users can run SPARQL queries against a configured SPARQL server.

## Usage

- It opens a dialog and loads an HTML interface for running SPARQL queries
- It initializes Yasgui inside the dialog using configuration from Config.sparql_server.url
- Queries are routed through a backend proxy to reach the SPARQL server
- Results are displayed in a scrollable panel, while errors are sent to MainController.errorAlert

<!-- AUTO-DESC:END -->


```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `SPARQL_endpoint.js`
- `SPARQLendpoint.html`

<!-- AUTO-INLINE-FILES:END -->

