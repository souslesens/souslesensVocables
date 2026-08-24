# MCP

SousLeSens exposes a [Model Context Protocol](https://modelcontextprotocol.io) server, so an LLM
agent can read sources, taxonomies, mappings and labels without going through the web interface.

The server is a separate process with its own URL. Ask your administrator for the one of your
instance, or try `https://<your-instance>/mcp`.

It is **read-only**. Every call is forwarded to `/api/v1` with your own bearer token, so the agent
sees exactly the sources your profile allows, under the same quotas, and can never write.

## Connecting a client

MCP is a standard protocol: whichever agent you use, it needs the same three facts.

| Fact      | Value                                  |
| --------- | -------------------------------------- |
| Transport | HTTP (streamable)                      |
| URL       | `https://sls.example.org/mcp`          |
| Auth      | header `Authorization: Bearer <token>` |

The token is the one described in [the API page](./index.md): user menu, **UserSettings**, tab
**API TOKEN**. The same token serves the REST routes and the MCP server.

Most clients are configured with a JSON file holding this block:

```json
{
    "mcpServers": {
        "souslesens": {
            "type": "http",
            "url": "https://sls.example.org/mcp",
            "headers": { "Authorization": "Bearer xxx" }
        }
    }
}
```

Where that file lives depends on the client, and that is the only part that changes:

| Client         | Where the block goes                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Claude Desktop | `claude_desktop_config.json`                                                                                               |
| Cursor         | `.cursor/mcp.json`                                                                                                         |
| Claude Code    | `claude mcp add --scope user --transport http souslesens https://sls.example.org/mcp --header "Authorization: Bearer xxx"` |
| Other          | see the client's own documentation; the three facts above are all it needs                                                 |

Register the server **globally** rather than for one directory. Several clients offer a scope
attached to the current project or working directory, and a server registered that way is invisible
as soon as the agent is started from anywhere else.

Restart the client after writing the configuration. Clients read their MCP servers once, at startup.

## Checking that it works

```shell
curl https://sls.example.org/healthz
```

Then, in the client, list the available tools: you should see about twenty names starting with
`sls_`, such as `sls_list_sources` or `sls_search_labels`. If the client lists none, it is a
configuration problem, not an access problem: see the table below.

`GET /catalog` returns the same list with, for each tool, the SousLeSens declaration it comes from.

## What the agent can do

The tool list is not authored for MCP: it is derived from the SousLeSens code itself, from the SPARQL
query registry and from the REST routes. The current inventory, and the rule that produces it, are
documented in `bin/MCP/README.md`.

In short, an agent can list your sources, search labels full text, walk a hierarchy up and down, read
a node's properties and definition, read ontology models, KGquery models and mapping files, and run
any read function of the SPARQL query registry.

Results are bounded. When an answer is too large it is cut, and the agent is told so along with the
total, so that it narrows its question instead of asking again for more.

## Troubleshooting

| Symptom                                                  | Cause                                                                                                                                                                        |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `401`                                                    | The token is expired or was renewed. Copy the current one from **UserSettings**, tab **API TOKEN**.                                                                          |
| `403`                                                    | Your profile has no access to the source the agent asked for.                                                                                                                |
| `429`                                                    | Your profile's quota for that route is exhausted. Slow down, or narrow the query.                                                                                            |
| The call ran past the deadline                           | The question is too heavy to answer in one call. The platform is not down. Bind the query with a type, a known predicate or a single source, and ask for one part at a time. |
| No tool at all, though the configuration file is written | The client was not restarted, or the server was registered in a scope tied to a working directory. Register it globally.                                                     |
| The server complains about an unsubstituted placeholder  | The header contains a `${VARIABLE}` that the environment starting the client does not define. Write the token literally, or export the variable before starting the client.  |
