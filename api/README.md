# SouslesensVocables API

SouslesensVocables API use the [OpenAPI specification](https://swagger.io/specification/)
to provide API routes.

## Swagger

SousLesensVocables serve a swagger UI to interact with the API. The swagger interface is available
at `/api/v1` endpoint.

## Access control

API routes are restricted with 2 functions: `restrictLoggedUser` and `restrictAdmin`.
These functions are defined in `app.js` during the openAPI initialization and are used on each
API route that needs restriction.

- `restrictLoggedUser` check that a user is authenticated. If not, a `401 UNAUTHORIZED` error
  will be raised.
- `restrictAdmin` check that a user is authenticated and is a member of the `admin` group.
  If not, a `401 UNAUTHORIZED` error will be raised.

### Exemple

- `/api/v1/health` route is public, no restriction method are used.
- `/api/v1/sources` with GET method is restricted to logged user, so the `restrictLoggedUser`
  function is used (file `api/v1/paths/users.js`)
- `/api/v1/sources` with POST method is restricted to admin only, so the `restrictAdmin` function
  is used.
