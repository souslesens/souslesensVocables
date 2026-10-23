# Python client

`souslesens` is the Python client for the SousLeSensVocables API. It wraps read routes of
`/api/v1` and is published on PyPI. The source is hosted at
[souslesens/sls-py-client](https://github.com/souslesens/sls-py-client).

## Installation

```bash
pip install souslesens
```

## Quick start

```python
from souslesens import SlsClient

client = SlsClient(token="xxx", base_url="http://localhost:3010")
client.health()
client.ask.knowledge_model_graph("ISO-14224-IOF")
```

The token is the same bearer token as the one described on the [API page](../api/index.md)
(user menu, **UserSettings**, tab **API TOKEN**). `base_url` defaults to `http://localhost:3010`.

## API

Each method mirrors the API path it calls. The `/api/v1/ask/...` endpoints live under `client.ask`.

| Method                                                          | Description                                                                                                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SlsClient(token, base_url="http://localhost:3010")`            | Client for the SousLeSensVocables API. `base_url` defaults to the local backend port.                                                                              |
| `health() -> dict`                                              | Calls `GET /api/v1/health`. Returns the parsed body (`{"health": {...}}`) whether the status is `200` or `500`.                                                    |
| `ask.knowledge_model_graph(source_label) -> dict`               | `GET /api/v1/ask/knowledgeModelGraph`. Returns a `{"nodes": [...], "edges": [...]}` graph of the source's main concepts and their relations.                       |
| `ask.linked_classes(source_label, uri1, uri2=None) -> dict`     | `GET /api/v1/ask/linkedClasses`. Returns a map `class URI -> relations` for the given class URI (optionally restricted to the relations reaching `uri2`).           |
| `ask.term_classes_infos(source_label, term) -> dict`            | `GET /api/v1/ask/termClassesInfos`. Returns a map `class URI -> {id, label, ancestors, predicates, relations}` for every class whose label matches `term`.         |
| `ask.terms_linked_classes(source_label, term1, term2=None)`     | `GET /api/v1/ask/termsLinkedClasses`. Same as `linked_classes` but resolving the classes from plain words instead of URIs.                                          |
| `ask.two_terms_shortest_path(source_label, term1, term2) -> list` | `GET /api/v1/ask/twoTermsShortestPath`. Returns the chains of properties joining `term1` and `term2`, each step being a `[subject, property, object]` list of `{id, label}` objects. |
| `ask.ontology_summary() -> list`                                | `GET /api/v1/ask/ontologySummary`. Returns one `{source, graphUri, imports, description}` entry per source the caller may read that describes itself.              |
| `ask.uri_classes_infos(source_label, uri) -> dict`              | `GET /api/v1/ask/uriClassesInfos`. Same description as `term_classes_infos`, starting from a class URI instead of a term.                                          |

## Exceptions

- `SlsClientError` — base class for all client failures (network error, invalid JSON response).
- `HealthCheckError(SlsClientError)` — the server returned `{"health": "error"}` (it could not probe
  itself).
