# Configure `sls-py-api`

## Non-docker

`sls-py-api` is configured with a `config.ini` file. An example file is available at
the root of the project.

| Section    | Entry                   | description                                                                                         | example                                      |
| ---------- | ----------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `main`     | `api_url_for_virtuoso`  | The API url, accessible for virtuoso. Set this value if `sls-py-api` is configured with docker      | `http:/sls-py-api:8000`                      |
| `main`     | `souslesens_config_dir` | Path of the `config` directory of `souslesens`                                                      | `/home/toto/souslesensVocables/config`       |
| `main`     | `log_level`             | Log level, `info`, `debug`, `warning`…                                                              | `info`                                       |
| `main`     | `get_rdf_graph_method`  | Method used to download a graph. Can be `api`, `sparql` or `isql`. See bellow for details           | `isql`                                       |
| `main`     | `post_rdf_graph_method` | Method used to upload a graph. Can be `api`, `api_batched` or `sparql_load`. See bellow for details | `sparql_load`                                |
| `main`     | `chunk_size`            | Chunk size if `api_batched` is used to post a graph                                                 | `50_000_000`                                 |
| `virtuoso` | `driver`                | Path to the `virtodbc_r.so` file. Used if `get_rdf_graph_method` is set to `isql`                   | `/usr/lib/x86_64-linux-gnu/odbc/virtodbc.so` |
| `virtuoso` | `host`                  | Virtuoso host                                                                                       | `localhost`                                  |
| `virtuoso` | `isql_port`             | Virtuoso isql port                                                                                  | `1111`                                       |
| `virtuoso` | `user`                  | Virtuoso user                                                                                       | `dba`                                        |
| `virtuoso` | `password`              | Virtuoso password                                                                                   | `dba`                                        |
| `cors`     | `origins`               | CORS configuration. See [CORS documentation](https://developer.mozilla.org/fr/docs/Web/HTTP/CORS)   | `*`                                          |
| `cors`     | `allowed_methods`       | CORS configuration. See [CORS documentation](https://developer.mozilla.org/fr/docs/Web/HTTP/CORS)   | `*`                                          |
| `cors`     | `allowed_headers`       | CORS configuration. See [CORS documentation](https://developer.mozilla.org/fr/docs/Web/HTTP/CORS)   | `*`                                          |
| `cors`     | `allowed_credentials`   | CORS configuration. See [CORS documentation](https://developer.mozilla.org/fr/docs/Web/HTTP/CORS)   | `yes`                                        |
| `rdf`      | `batch_size`            | Batch size if `post_rdf_graph_method` is `api_batched`.                                             | `10000`                                      |

## Docker

If `sls-py-api` is installed with docker, the configuration is handled via environment variables.

All properties defined in the
[config.ini](https://github.com/souslesens/sls-py-api/blob/branch/default/config.ini.default)
can be configured with environment variables. Variables must have a format like
`$SECTION_$KEY=$VALUE` and must be uppercased. For example, `MAIN_API_URL_FOR_VIRTUOSO=http://toto.com` will be equivalent as the following ini:

```ini
[main]
api_url_for_virtuoso = http://toto.com
```
