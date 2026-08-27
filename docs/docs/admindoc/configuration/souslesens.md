# SousLeSens configuration

SouslesensVocables configuration is stored on the `config` directory.
(under `${DATA_ROOT_DIR}/souslesens/vocables` if deployed with `docker`).

## `mainConfig.json`

The `mainConfig.json` contain all the `souslesensVocables` configuration.

-   `souslesensUrl`: the public URL of SousLeSens, with protocol and port.
-   `souslesensUrlForVirtuoso`: the URL of SousLeSens, from Virtuoso. It's used to pull RDF data
    from the SousLeSens server.
-   `listenPort`: The listen port of SousLeSens.
-   `serverUrl`: The base URL used to build the graph traversal queries.
-   `theme`: the UI theme of SousLeSens
    -   `selector`: Display a selector to choose the UI theme
    -   `defaultTheme`: Set the fallback theme
-   `auth`: The authentication mechanisme. Can be `local`, `keycloak`, `auth0`, `database` or `disabled`
-   `cookieSameSite`: The value of the `SameSite` attribute of the session cookies
-   `cookieSecure`: Mark the session cookies as `Secure` (sent over HTTPS only)
-   `cookieSecureTrustProxy`: Trust the `X-Forwarded-Proto` header to set the `Secure` flag behind a
    reverse proxy
-   `cookieMaxAge`: The lifetime of the session cookies, in milliseconds
-   `defaultGroups`: The groups assigned by default to the users
-   `logs`: The logger configuration for the server
    -   `directory`: The path to the directory where the log files are stored
    -   `useFileLogger`: Set to `false` to disable the file logger and the writing on the filesystem
    -   `useSymlink`: Set to `false` to disable the creation of symlinks in the logs directory. Useful for the operating system which have a hard time to manage them.
-   `default_lang`: The default language of the application, used for the SPARQL queries and labels
-   `sentryDsnNode`: The sentry DSN for the server
-   `sentryDsnJsFront`: The sentry DSN for the client
-   `formalOntologySourceLabel`: The label of the formal ontology source, added as read-only to the
    users
-   `tools_available`: The list of available tools. Values: `lineage`, `KGcreator`, `KGquery`,
    `admin`, `ConfigEditor`, `GraphManagement`, `UserSettings`, `OntoCreator`
-   `auth0`: If `auth` is set to `auth0`, the auth0 configuration.
    -   `domain`: the `auth0` domain
    -   `clientID`: Auth0 clientID
    -   `clientSecret`: Auth0 clientSecret
    -   `scope`: Auth0 scope. Set it to `openid email profile`
    -   `api`: Auth0 API configuration
        -   `clientID`: Auth0 API clientID
        -   `clientSecret`: Auth0 API clientSecret
    -   `usernameMapping`: The Auth0 field used as the login. Can be `email`, `nickname` or `name`
    -   `useAuth0Roles`: Set to `true` to use the Auth0 roles as SLS groups
-   `keycloak`: If `auth` is set to `keycloak`, the KeyCloak configuration
    -   `realm`: The KeyCloak realm
    -   `publicClient`: `true` if the client is public
    -   `clientID`: The KeyCloak clientID
    -   `clientSecret`: The KeyCloak clientSecret
    -   `authServerURL`: The public URL of the KeyCloak server
-   `health_enabled_services`: The services checked by the `/api/v1/health` endpoint. Default:
    `virtuoso`, `elasticsearch`, `spacyserver`
-   `sparql_server`: The SPARQL server configuration (Virtuoso)
    -   `url`: The url of the SPARQL server, with protocol and port and path
    -   `user`: Virtuoso user
    -   `password`: Virtuoso password
-   `ElasticSearch`: The Elasticsearch server configuration

    **Compatibility:** Only Elasticsearch 8.x is supported. Elasticsearch 7 and earlier versions are not compatible.

    -   `url`: The ElasticSearch URL, with protocol and port
    -   `user`: The ElasticSearch user
    -   `password`: The ElasticSearch password
    -   `skipSslVerify`: Set to `true` to skip SSL verify (with self-signed certs)
    -   `other_servers`: List of other ElasticSearch nodes
    -   `searchChunkSize`: Size of chunk for the indices search

    **Note:** Elasticsearch 8 enables security (SSL/TLS + authentication) by default. For development environments, you can disable it by setting `xpack.security.enabled: false` in your docker-compose configuration.
-   `jowlServer`:
    -   `enabled`: `true` if the [JOWL](https://github.com/souslesens/jowl) server is enabled
    -   `url`: The JOWL URL, with protocol and port
-   `slsPyApi`: [sls-py-api](https://github.com/souslesens/sls-py-api) configuration
    -   `enabled`: `true` if sls-py-api is enabled
    -   `url`: The url of sls-py-api (with protocol and port)
-   `llm`: The LLM provider configuration used by AI features.
    -   `provider`: Active provider. Supported values: `anthropic`, `openrouter`, `ollama`.
    -   `<provider>`: Provider-specific settings. The section name must match `provider`.
-   `database`: The database configuration used to store the users
    -   `user`: The database user
    -   `password`: The database password
    -   `host`: The database host
    -   `database`: The database name
    -   `port`: The database port
-   `annotator`: The annotator configuration (optional)
    -   `tikaServerUrl`: The URL of the Apache Tika server
    -   `spacyServerUrl`: The URL of the spaCy server
    -   `parsedDocumentsHomeDir`: The home directory of the parsed documents. `null` to disable.
    -   `uploadDirPath`: The path of the upload directory. `null` to disable.
-   `wiki`: The wiki configuration
    -   `url`: The wiki URL, with protocol and port
-   `userData`: The configuration of the userData file management system
    -   `location`: the system used to store the file content (`file` or `database`)
    -   `maximumFileSize`: the maximum file content size allowed in the database (in bytes)
-   `sparqlDownloadLimit`: The maximum number of rows per page when downloading SPARQL results from
    the `/api/v1/rdf/graph` endpoints. Maximum `1000000`.
-   `generalQuota`: The general quotas per API route and HTTP method. A mapping of
    `{ route: { method: number } }`, for example `{ "source": { "GET": 10 } }`.
-   `metrics`: The server metrics configuration
    -   `enabled`: Set to `true` to expose the metrics
    -   `auth`: The basic authentication protecting the `/metrics` endpoint
        -   `enabled`: `true` to enable the basic authentication
        -   `username`: The username
        -   `password`: The password
    -   `virtuoso`: The Virtuoso load protection settings. These back the `restrictVirtuosoLoad`
        security handler, which answers `429` to the heavy SPARQL/RDF endpoints once the estimated
        load crosses a threshold.
        -   `maxPending`: Number of in-flight SPARQL requests above which the estimated load is
            considered to be 100%. The load ratio is `pending / maxPending × 100`, capped at 100.
            Default `50`.
        -   `maxLoad`: Global load threshold (0-100), in percent, above which protected endpoints
            answer `429`. It applies to users whose profiles define no `maxVirtuosoLoad` (see
            [rights-and-quotas](rights-and-quotas.md)). Default `80`.

    **Note:** `maxPending` here is the scale the estimated load is measured against, not the
    threshold that triggers the refusal; the refusal threshold is `maxLoad`.

### LLM provider configuration

The AI integration is configured in `config/mainConfig.json` under the `llm` section. SLS reads and
validates this section at startup from `model/config.js`, then `bin/AI/llmClient.js` selects the
adapter matching `llm.provider`.

Only one provider is active at a time:

```json
{
    "llm": {
        "provider": "anthropic",
        "anthropic": {
            "apiKey": "sk-ant-api03-...",
            "defaultModel": "claude-sonnet-4-6",
            "maxTokens": 1024,
            "rateLimitTPM": 28000
        }
    }
}
```

Supported providers:

| Provider | Required settings | Optional settings |
| --- | --- | --- |
| `anthropic` | `apiKey`, `defaultModel` | `maxTokens`, `rateLimitTPM` |
| `openrouter` | `apiKey`, `defaultModel` | `maxTokens`, `rateLimitTPM`, `appUrl`, `appName` |
| `ollama` | `defaultModel` | `baseUrl`, `maxTokens`, `rateLimitTPM` |

Defaults are defined in `model/config.js`. `ollama.baseUrl` defaults to `http://localhost:11434`.

`maxTokens` is the ceiling on what the model may produce in a single turn, and it is the only
authority on that: `POST /api/v1/ai/complete` clamps any value a caller asks for down to it, so the
chat panel and any other client answer within the limit set here. It defaults to 1024, which cuts
long answers off mid-sentence, and its maximum is 32768. When a turn does hit the ceiling the answer
comes back with `stopReason: "max_tokens"` and the applied `maxTokens`, and the chat panel says so
under the truncated text.

#### API key encryption

LLM API keys can be stored encrypted in `mainConfig.json`. The server decrypts values prefixed with
`enc:v1:` when `SLS_SECRET_KEY` is set.

To print an encrypted key:

```powershell
$env:SLS_SECRET_KEY = "my-passphrase"
node bin/AI/encryptKey.js sk-ant-api03-...
```

To encrypt the current `llm.<provider>.apiKey` in place:

```powershell
$env:SLS_SECRET_KEY = "my-passphrase"
node bin/AI/encryptKey.js --in-place
```

The same `SLS_SECRET_KEY` must be available when the SLS server starts.
