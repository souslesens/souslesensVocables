# SousLeSens configuration

SouslesensVocables configuration is stored on the `config` directory.
(under `${DATA_ROOT_DIR}/souslesens/vocables` if deployed with `docker`).

## `mainConfig.json`

The `mainConfig.json` contain all the `souslesensVocables` configuration.

-   `souslesensUrl`: the public URL of SousLeSens, with protocol and port.
-   `souslesensUrlForVirtuoso`: the URL of SousLeSens, from Virtuoso. It's used to pull RDF data
    from the SousLeSens server.
-   `listenPort`: The listen port of SousLeSens.
-   `serverUrl`:
-   `theme`: the UI theme of SousLeSens
    -   `selector`: Display a selector to choose the UI theme
    -   `defaultTheme`: Set the fallback theme
-   `auth`: The authentication mechanisme. Can be `local`, `keycloak`, `auth0`, `database` or `disabled`
-   `auth0`: If `auth` is set to `auth0`, the auth0 configuration.
    -   `domain`: the `auth0` domain
    -   `clientID`: Auth0 clientID
    -   `clientSecret`: Auth0 clientSecret
    -   `scope`: Auth0 scope. Set it to `openid email profile`
    -   `api`: Auth0 API configuration
        -   `clientID`: Auth0 API clientID
        -   `clientSecret`: Auth0 API clientSecret
-   `keycloak`: If `auth` is set to `keycloak`, the KeyCloak configuration
    -   `realm`: The KeyCloak realm
    -   `publicClient`: `true` if the client is public
    -   `clientID`: The KeyCloak clientID
    -   `clientSecret`: The KeyCloak clientSecret
    -   `authServerURL`: The public URL of the KeyCloak server
-   `authenticationDatabase`: If `auth` is `database`, The database configuration
    -   `user`: The database user
    -   `password`: The database password
    -   `host`: The database host
    -   `port`: The database port
    -   `database`: The database name
    -   `table`: The database table that contains the users
    -   `loginColumn`: The column on the table that contains the login
    -   `groupsColumn`: The column on the table that contains the groups
-   `sentryDnsNode`: The sentry DSN for the server
-   `sentryDnsJsFront`: The sentry DSN for the client
-   `slsPyApi`: [sls-py-api](https://github.com/souslesens/sls-py-api) configuration
    -   `enabled`: `true` if sls-py-api is enabled
    -   `url`: The url of sls-py-api (with protocol and port)
-   `sparql_server`: The SPARQL server configuration (Virtuoso)
    -   `url`: The url of the SPARQL server, with protocol and port and path
    -   `user`: Virtuoso user
    -   `password`: Virtuoso password
-   `Elasticsearch`: The Elasticsearch server configuration

    **Compatibility:** Only Elasticsearch 8.x is supported. Elasticsearch 7 and earlier versions are not compatible.

    -   `url`: The ElasticSearch URL, with protocol and port
    -   `user`: The ElasticSearch user
    -   `password`: The ElasticSearch password
    -   `skipSslVerify`: Set to `false` to skip SSL verify (with self-signed certs)
    -   `other_servers`: List of other ElasticSearch nodes
    -   `searchChunkSize`: Size of chunk for the indices search

    **Note:** Elasticsearch 8 enables security (SSL/TLS + authentication) by default. For development environments, you can disable it by setting `xpack.security.enabled: false` in your docker-compose configuration.
-   `jowlServer`:
    -   `enabled`: `true` if the [JOWL](https://github.com/souslesens/jowl) server is enabled
    -   `url`: The JOWL URL, with protocol and port
-   `llm`: The LLM provider configuration used by AI features.
    -   `provider`: Active provider. Supported values: `anthropic`, `openrouter`, `ollama`.
    -   `<provider>`: Provider-specific settings. The section name must match `provider`.
-   `wiki`: The wiki configuration
    -   `url`: The wiki URL, with protocol and port
-   `logs`: The logger configuration for the server
    -   `directory`: The path to the directory where the log files are stored
    -   `useFileLogger`: Set to `false` to disable the file logger and the writing on the filesystem
    -   `useSymlink`: Set to `false` to disable the creation of symlinks in the logs directory. Useful for the operating system which have a hard time to manage them.
-   `userData`: The configuration of the userData file management system
    -   `location`: the system used to store the file content (`file` or `database`)
    -   `maximumFileSize`: the maximum file content size allowed in the database (in bytes)

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
