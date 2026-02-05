# Core API routes

## Overview

This section documents the core API routes exposed directly under the `paths/` directory.  
These routes provide general-purpose and cross-cutting functionalities used by the platform, such as health checks, configuration access, logging, uploads, and utility operations.

---

## health.js

**Endpoint:** `GET /api/v1/health`

This endpoint provides a health check for the platform and its main external dependencies. It retrieves the runtime configuration and tests the availability of enabled services, including the SPARQL server (Virtuoso), ElasticSearch, and the SpaCy annotation server.

The response returns a boolean status for each service. If all enabled services are healthy, the endpoint responds with **HTTP 200**. If at least one enabled service is unavailable, it responds with **HTTP 500**.

---

## config.js

_To be documented._

---

## logs.js

_To be documented._

---

## upload.js

_To be documented._

---

## httpProxy.js

_To be documented._

---

## utils.js

_To be documented._

---

## Other core routes

- `annotate.js`
- `blenderSources.js`
- `copygraph.js`
- `getOntologyRootUris.js`
- `graphvis.js`
- `ontologyModels.js`
- `prefixes.js`
- `profiles.js`
- `rdf-io.js`
- `shaclValidate.js`
- `shortestPath.js`
- `sparqlProxy.js`
- `tools.js`
- `triples2rdf.js`
- `users.js`
- `yasguiQuery.js`

_Descriptions for these routes will be added incrementally._
