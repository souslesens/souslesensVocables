# `sls-py-api`

`sls-py-api` is an optional [FastAPI](https://fastapi.tiangolo.com/) service that proxies RDF graph
read and write to a [Virtuoso](https://virtuoso.openlinksw.com/) triplestore and authenticates users
against the SousLeSens API. It is used by the SousLeSens application for graph download, upload and
deletion (see the [architecture](../../installation/architecture/architecture.md) page).

The service listens on port `8000` and exposes its OpenAPI contract on Swagger at `/docs`.

## Authentication

Every route except `/api/v1/health` requires an HTTP `Authorization` header with a Bearer token:

```shell
curl --header "authorization: Bearer <token>" http://sls-py-api:8000/api/v1/health
```

The token is the same API token as the one described on the
[API page](../../api/index.md) (user menu, **UserSettings**, tab **API TOKEN**). It is validated
against the SousLeSens API (`/users/me`) on each request.

Access to a source is checked per user: the service fetches the user's sources from the SousLeSens
API and allows read or write only for sources whose `accessControl` is `read` or `readwrite`.

| Error | Meaning                                                     |
| ----- | ----------------------------------------------------------- |
| 400   | Malformed `Authorization` header                             |
| 405   | Authentication scheme is not `Bearer`                        |
| 401   | Unknown token, or user not authorized to access the source   |
| 502   | The SousLeSens API returned a malformed source descriptor    |
| 500   | Internal error                                               |

## Configuration

### Non-docker

`sls-py-api` is configured with a `config.ini` file. An example file is available at the root of
the project.

| Section    | Entry                        | Description                                                                                              | example                                                         |
| ---------- | ---------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `main`     | `souslesens_api_url`         | Base URL of the SousLeSens API (used for auth, config and sources)                                        | `http://localhost:3010/api/v1`                                  |
| `main`     | `api_url_for_virtuoso`       | The API URL, accessible from Virtuoso. Set this value if `sls-py-api` is configured with docker           | `http://sls-py-api:8000`                                        |
| `main`     | `log_level`                  | Log level, `info`, `debug`, `warning`…                                                                    | `info`                                                          |
| `main`     | `get_rdf_graph_method`       | Method used to download a graph. Can be `api` or `isql`                                                   | `api`                                                           |
| `main`     | `post_rdf_graph_method`      | Method used to upload a graph. Can be `api` or `sparql_load`                                               | `api`                                                           |
| `main`     | `delete_rdf_graph_method`    | Method used to delete a graph. Can be `api` or `isql`                                                      | `api`                                                           |
| `virtuoso` | `sparql_url`                 | Virtuoso SPARQL endpoint URL                                                                              | `http://localhost:8890/sparql`                                  |
| `virtuoso` | `driver`                     | Path to the `virtodbc_r.so` file. Used if `get_rdf_graph_method` or `delete_rdf_graph_method` is `isql`   | `/usr/local/virtuoso-opensource/lib/virtodbc_r.so`              |
| `virtuoso` | `host`                       | Virtuoso host                                                                                             | `localhost`                                                     |
| `virtuoso` | `isql_port`                  | Virtuoso isql port                                                                                        | `1111`                                                          |
| `virtuoso` | `user`                       | Virtuoso user                                                                                             | `dba`                                                           |
| `virtuoso` | `password`                   | Virtuoso password                                                                                         | `dba`                                                           |
| `cors`     | `origins`                    | CORS configuration. See [CORS documentation](https://developer.mozilla.org/fr/docs/Web/HTTP/CORS)         | `*`                                                             |
| `cors`     | `allowed_methods`            | CORS configuration. See [CORS documentation](https://developer.mozilla.org/fr/docs/Web/HTTP/CORS)         | `*`                                                             |
| `cors`     | `allowed_headers`            | CORS configuration. See [CORS documentation](https://developer.mozilla.org/fr/docs/Web/HTTP/CORS)         | `*`                                                             |
| `cors`     | `allowed_credentials`        | CORS configuration. See [CORS documentation](https://developer.mozilla.org/fr/docs/Web/HTTP/CORS)         | `yes`                                                           |
| `rdf`      | `convert_blank_nodes_to_uris`| If `true`, convert blank nodes to URIs before uploading a graph                                            | `true`                                                          |

### Docker

If `sls-py-api` is installed with docker, the configuration is handled via environment variables.

All properties defined in the
[config.ini](https://github.com/souslesens/sls-py-api/blob/branch/default/config.ini.default)
can be configured with environment variables. Variables must have a format like
`$SECTION_$KEY=$VALUE` and must be uppercased. For example, `MAIN_API_URL_FOR_VIRTUOSO=http://toto.com` will be equivalent as the following ini:

```ini
[main]
api_url_for_virtuoso = http://toto.com
```

## API routes

| Route                  | Method | Description                                    |
| ---------------------- | ------ | ---------------------------------------------- |
| `/api/v1/health`       | GET    | Health check                                   |
| `/api/v1/rdf/convert`  | POST   | Convert RDF data between serialization formats |
| `/api/v2/rdf/graph`    | GET    | Download a graph (paged via SPARQL)            |
| `/api/v1/rdf/graph`    | POST   | Upload a graph (chunked)                       |
| `/api/v1/rdf/graph`    | DELETE | Delete a graph                                 |

### Health

`GET /api/v1/health` returns `{"health": "ok"}`. It does not require authentication.

### Convert RDF format

`POST /api/v1/rdf/convert` converts RDF data. The request is a multipart form with the file to
convert (`data`), the `input_format` (default `sls`) and the `output_format` (default `turtle`).
It returns the converted data:

```shell
curl -X POST --header "authorization: Bearer <token>" \
     -F "data=@graph.ttl" -F "input_format=turtle" -F "output_format=nt" \
     http://sls-py-api:8000/api/v1/rdf/convert
```

Supported formats: `xml`, `n3`, `turtle`, `nt`, `pretty-xml`, `trig`, `json-ld`, `hext`, plus `sls`
as an input format.

The `sls` input format is a JSON document with a `prefixes` object (mapping prefix to URI) and a
`data` array of triples `{subject, predicate, object}`:

```json
{
  "prefixes": { "skos": "http://www.w3.org/2004/02/skos/core#" },
  "data": [
    { "subject": "http://example.org/term1", "predicate": "skos:prefLabel", "object": "Term one" }
  ]
}
```

### Download a graph (v2)

`GET /api/v2/rdf/graph` downloads a graph paged via SPARQL `LIMIT/OFFSET`. It is the route used by
the current SousLeSens application.

Query parameters: `source` (required), `offset` (default `0`), `format` (default `nt`),
`skipNamedIndividuals` (default `false`), `withImports` (default `false`).

The page size is `sparqlDownloadLimit` from the SousLeSens configuration. On the first call
(`offset=0`), contributor and import triples are added to the graph.

```shell
curl --header "authorization: Bearer <token>" \
     "http://sls-py-api:8000/api/v2/rdf/graph?source=my-source&offset=0&format=nt"
```

The response contains `graph_size`, `next_offset` and `data`. Keep calling with the returned
`next_offset` until it is `null`. Requires read access to the source.

### Upload a graph

`POST /api/v1/rdf/graph` uploads a graph, chunk by chunk. The request is a multipart form with
`source` (required), `data` (the file chunk), `last` (`true` on the final chunk), `clean` (`true`
to discard the temporary file) and `identifier` (ULID returned by the first call).

The first call (without `identifier`) stores the chunk in a temporary file and returns an
`identifier`. Subsequent calls append to the file. When `last=true`, or when the uploaded file is
n-triples, the graph is loaded into Virtuoso and the temporary file is removed.

```shell
curl -X POST --header "authorization: Bearer <token>" \
     -F "source=my-source" -F "data=@graph.nt" -F "last=true" -F "clean=false" \
     http://sls-py-api:8000/api/v1/rdf/graph
```

Blank nodes are converted to URIs before upload when `rdf.convert_blank_nodes_to_uris` is `true`.
The final response contains `identifier`, `has_blank_nodes` and `blank_nodes_converted`. Requires
readwrite access to the source.

### Delete a graph

`DELETE /api/v1/rdf/graph` deletes a graph:

```shell
curl -X DELETE --header "authorization: Bearer <token>" \
     "http://sls-py-api:8000/api/v1/rdf/graph?source=my-source"
```

It returns `{"message": "<source> deleted"}`. Requires readwrite access to the source.
