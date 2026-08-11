# SousLeSens MCP server (V1, read-only)

Independent Express process exposing SousLeSens to LLM agents through the Model Context Protocol.

```bash
npm run start:mcp          # http://localhost:3011/mcp
npm run dev:mcp            # same, with nodemon
```

Client configuration:

```json
{
    "mcpServers": {
        "souslesens": {
            "url": "http://localhost:3011/mcp",
            "headers": { "Authorization": "Bearer sls-…" }
        }
    }
}
```

Get a token with `POST /api/v1/users/token`.

## The rule this server is built on

**The catalog is derived from SousLeSens code. It is never authored here.**

A developer who wants an agent to reach something edits the thing itself, not this directory. There
is no manifest, no allow-list and no tool description anywhere under `bin/MCP/`: this process reads
two declarations out of the product and converts them to MCP shape.

```text
sparql_{OWL,SKOS,generic}.js  --@expose/@mcpTool/@mcpFixed-->  sparqlRegistryExtractor
                                                                       |
api/v1/paths/**  --x-mcp in .apiDoc-->  GET /api/v1/api-docs           |
                                                    |                  |
                                                    +--> catalog.js <--+   (format conversion only)
                                                              |
                                                              v
                                                     MCP catalog, in memory
```

Anything that looks like MCP-specific knowledge living in this directory is a bug in the design, not
a shortcut. The one exception is stated below.

### Declaring a SPARQL function

In the function's JSDoc, in `public/vocables/modules/sparqlProxies/`:

```js
/**
 * Returns the roots of a source's class or concept hierarchy… (first paragraph = what an agent reads)
 *
 * Pagination strategy, callers, history… (everything after a blank line is human-only)
 * @param {string} sourceLabel - Source name to query
 * @param {boolean} [options.skipTopClassFilter] - Do not apply any top-class filter
 * @expose read
 * @mcpTool sls_top_concepts
 */
```

| Tag                      | Effect                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `@expose read \| write`  | Mandatory argument. `write` can never become an agent tool. A bare `@expose` fails the extraction, naming the function.    |
| `@mcpTool <name>`        | Promotes the function to a first-class tool. Without it, the function is still reachable through `sls_run_query_function`. |
| `@mcpFixed <target>=<v>` | Freezes a parameter or an `options` key. The key disappears from the input schema, so an agent cannot set it.              |

Agent-facing parameter names, types and descriptions all come from `@param`. There is no renaming
layer: a tool's arguments are the function's own parameters.

One exception, for size: the sub-keys of `options` keep their names and types but lose their
per-key prose, which was the single largest item of `tools/list` and is sent on every turn. The
guidance that actually changes an agent's behaviour belongs in the summary paragraph, which is sent
anyway; the rest is one `sls_list_query_functions` call away. If a whole option should not be
offered at all, that is a domain decision and it is spelled `@mcpFixed`, in the function's JSDoc.

The summary an agent reads is capped at 500 characters, enforced by the extractor. Over budget means
the first paragraph is too long — insert a blank JSDoc line, do not shorten the human documentation.

### Declaring a REST route

An `x-mcp` key inside the operation's `.apiDoc`, next to `description`. `x-` is the only prefix
Swagger 2.0 accepts on an operation, and `openapi.initialize` validates every `.apiDoc` at SLS boot,
so a plain `mcp:` key would crash the backend.

```js
GET.apiDoc = {
    operationId: "dataReadFile",
    "x-mcp": {
        tools: [
            {
                name: "sls_kgquery_model",
                access: "read",
                description: "…",
                params: { source: { type: "string", required: true, description: "…" } },
                query: { dir: "graphs/", fileName: "{source}_KGmodelGraph.json" },
                parseJsonPayload: true,
                statusHints: { 500: "…" },
            },
        ],
    },
    …
};
```

One route may declare several tools. `query` and `body` are templates: a value that is exactly
`{param}` is substituted with the raw argument, keeping its type; a value containing `{param}` is
interpolated; anything else is a frozen literal, and a key whose placeholders have no value is
dropped. Parameter types use the same vocabulary as the JSDoc (`string`, `number`, `boolean`,
`Object`, `any`, `string[]`, …) — the Swagger spelling `"object"` is refused, naming the route.

Optional keys: `parseJsonPayload`, `emptyListWhenNull`, `resultShape`, `statusHints`,
`registryFunctionGuard`.

The whole block is validated by a strict zod schema at startup. Swagger treats every `x-` key as
opaque, so a typo would otherwise pass the SLS boot and simply produce a tool missing the feature
its author asked for. Instead the MCP server refuses to start and says where:

```text
[mcp] the x-mcp declaration of GET /data/files is unusable — tools.0: Unrecognized key(s) in object: 'statusHint'
```

## The 22 tools

Every one of them traces back to a declaration in product code, and `GET /catalog` says which.

| Declared in                      | Tools                                                                                                                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sparql_generic.js` (`@mcpTool`) | `sls_top_concepts`, `sls_node_infos`, `sls_node_parents`, `sls_node_children`, `sls_source_taxonomy`, `sls_distinct_predicates`                                                                                    |
| `sparql_OWL.js` (`@mcpTool`)     | `sls_node_definition`, `sls_node_descendants`, `sls_node_properties`, `sls_filtered_triples`, `sls_property_schema`, `sls_property_usage`                                                                          |
| `api/v1/paths/**` (`x-mcp`)      | `sls_list_sources`, `sls_whoami`, `sls_ontology_model`, `sls_kgquery_model`, `sls_mappings_list`, `sls_mapping_get`, `sls_search_labels`, `sls_list_indexes`, `sls_list_query_functions`, `sls_run_query_function` |

`sls_search_labels` is the natural-language entry point: the node tools all need a URI, and
full-text label search is what produces one from a user's phrase.

`sls_list_query_functions` and `sls_run_query_function` reach the 34 read functions of the registry
that no `@mcpTool` promotes. They are not MCP machinery — they are `GET /sparqlQueries/catalog` and
`POST /sparqlQueries/run`, declared like any other route.

## Files

| File              | Role                                                                                |
| ----------------- | ----------------------------------------------------------------------------------- |
| `www`             | entry point: Express app, `POST /mcp`, `GET /healthz`, `GET /catalog`               |
| `mcpServer.js`    | MCP protocol handlers (`tools/list`, `tools/call`) and the response size guard      |
| `catalog.js`      | registry + `x-mcp` → MCP descriptors. SLS types → JSON Schema. No domain knowledge. |
| `execute.js`      | one tool call → one SLS API request; template filling, flattening, read-only guard  |
| `slsClient.js`    | fetch wrapper, caller context, HTTP status → actionable message                     |
| `config.js`       | environment configuration                                                           |
| `instructions.md` | cross-cutting rules, returned with `initialize` (see below)                         |

The single behaviour this server owns is its own policy: **V1 is read-only**, so anything not
declared `read` is refused. That is a property of this server, not of SousLeSens, which is exactly
why it lives here and not in a tag.

### Instructions, not a prompt

`instructions.md` is returned with the `initialize` result, so every client hands it to the model at
connection time without the user asking for anything. An MCP _prompt_ is user-invoked, like a slash
command: a rule the agent must never break cannot live there, because nothing guarantees it is ever
read.

It is therefore strictly cross-cutting — ground every claim, an empty result is not an absence,
truncation means narrow rather than retry bigger, what the sibling keys mean. Anything true of one
tool belongs to that tool's description, which comes from the SousLeSens code and is sent with
`tools/list` anyway. Repeating it here would recreate the second source of truth this design exists
to prevent, and would cost tokens twice.

## Things a reviewer will want to "fix" — don't

**No tool is defined in this directory, on purpose.** If a tool is missing, add `@mcpTool` to the
function or `x-mcp` to the route. Adding it here would restore the drift this design exists to
prevent: two catalogs, one for humans and one for agents, disagreeing silently.

**`POST` is not forbidden.** `sls_run_query_function` and `sls_search_labels` are POSTs declared
`access: "read"`. Read-only is enforced from the declared access, never from the HTTP verb.

**The extraction throws, on purpose.** A bare `@expose`, an `@mcpTool` on a write function, an
`@mcpFixed` pointing at a parameter that no longer exists, or a summary over budget all fail the
build, naming the function. That is what prevents a new write from silently becoming an agent tool.
Do not turn any of them into a warning.

**`registryFunctionGuard` is what keeps the generic runner honest.** `POST /sparqlQueries/run`
legitimately runs writes for other clients. The guard declares that `name` and `module` designate a
catalog entry, so this server can refuse anything that is not `@expose read` in an allowed module
before forwarding. Removing it hands agents every write in the registry.

**There is no client-side concurrency cap, on purpose.** An agent walking a taxonomy does fire calls
faster than the web UI ever did, but several MCP processes, the browser and Yasgui all reach the
same triple store: a per-process ceiling bounds only itself, while giving the impression the server
is protected. Bounding SPARQL pressure belongs to the single point every client goes through, in the
SLS backend — `maxConcurrentSparqlQueries` on `sparqlProxy`, in the offer-limits work. A ceiling here
would put a second place in charge of a decision that has exactly one right home, which is the
mistake this whole directory exists to avoid.

**`query` templates are never agent-controlled.** `GET /data/file` and `GET /data/files` are generic
readers over the whole data directory, and `dataController` joins the path without a traversal
guard. Only the frozen `graphs/` and `mappings/<source>` prefixes are reachable. Declaring a tool
that lets an agent supply `dir` or `fileName` hands it arbitrary read access to `dataDir`.

**`Sparql_SKOS` carries no `@expose` at all.** Not a filter, an absence: its functions are in no
catalog, neither the agent's nor `GET /api/v1/sparqlQueries/catalog`. SKOS sources stay fully
reachable all the same, because `Sparql_generic` dispatches to `Config.sources[source].controller`,
so `sls_top_concepts` works on an OWL and on a SKOS source alike. Exposing both modules would only
give a caller a chance to pick the wrong one.

**SPARQL bindings are flattened, deliberately.** A binding cell is `{value, type?, "xml:lang"?}` and
the value is normally all an agent needs. Flattening cuts a real payload roughly in half (measured:
37 900 → 22 625 characters on a 226-row dictionary). What would otherwise be lost comes back as
sibling keys, emitted only when present so the common cell still costs one key: `<column>Lang`,
`<column>Datatype`, and `<column>IsBlankNode`. That last one matters — a blank node cannot be
queried by URI, it is reached by looking for triples that point at it — and it is not derived from
`type` alone, because Virtuoso hands blank nodes back as `nodeID://…` IRIs.

## Known gaps of this V1

- Config comes from environment variables, not `config/mainConfig.json` (whose zod schema is
  `.strict()`: an unknown key makes the main server exit at boot).
- `tools/list` costs ~5 000 tokens for 22 tools (measured, 18 540 characters). The remaining lever
  is the JSDoc: a shorter summary paragraph, or `@mcpFixed` on options an agent should not choose.
- Stateless transport: one server and one transport per request, no session map, no server-to-client
  notifications.
- The size guard only cuts rows from the tail. No offset paging, no per-cell truncation, no result
  cache, no structured provenance.
- `POST /sparqlProxy` (dynamic SPARQL) carries no `x-mcp`: it needs three guards first — MCP-side
  URL resolution against SSRF, refusal of UPDATE forms, and refusal of sources that are not on the
  default endpoint.
- No MCP prompts yet. `instructions.md` covers the rules an agent must never break, because it is
  delivered automatically; prompts are user-invoked and suit task templates, which is a separate
  piece of work.
- No resources, no OAuth.

## Environment variables

| Variable                   | Default                        |
| -------------------------- | ------------------------------ |
| `MCP_LISTEN_PORT`          | `3011`                         |
| `MCP_SLS_API_URL`          | `http://localhost:3010/api/v1` |
| `MCP_REQUEST_TIMEOUT_MS`   | `60000`                        |
| `MCP_MAX_RESPONSE_BYTES`   | `100000`                       |
| `MCP_DEFAULT_SPARQL_LIMIT` | `200`                          |

## Tests

```bash
SLS_MCP_URL=http://localhost:3011/mcp SLS_MCP_TEST_TOKEN=sls-… npm run test:mcp
```

Needs a running SLS backend and a running MCP server. 21 checks, including the one that matters
here: every advertised tool traces back to a code declaration.
