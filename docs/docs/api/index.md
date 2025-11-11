# API

SousLeSens provide API routes with [OpenAPI](https://swagger.io/specification/) standards.
A [Swagger](https://swagger.io/) interface is available at `/api/v1`.

Most routes are intended to be used by SousLeSens application, but some can be used outside
SousLeSens. The following documentation describle routes that can be used outised SousLeSens.
For other routes, refer to the OpenAPI documentation available on the Swagger interface.

Authentication via a bearer token is required to use the routes. Token is available via the
_UserSettings_ tool.

```shell
curl --header "authorization: Bearer xxx" http://sls.example.org/api/v1/users/me
```

```{toctree}
:maxdepth: 3
userdata.md
```

