# Advanced configuration

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
    -   `url`: The ElasticSearch URL, with protocol and port
    -   `user`: The ElasticSearch user
    -   `password`: The ElasticSearch password
    -   `skipSslVerify`: Set to `false` to skip SSL verify (with self-signed certs)
    -   `other_servers`: List of other ElasticSearch nodes
    -   `searchChunkSize`: Size of chunk for the indices search
-   `jowlServer`:
    -   `enabled`: `true` if the [JOWL](https://github.com/souslesens/jowl) server is enabled
    -   `url`: The JOWL URL, with protocol and port
-   `wiki`: The wiki configuration
    -   `url`: The wiki URL, with protocol and port
