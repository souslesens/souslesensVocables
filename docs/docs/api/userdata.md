# UserData

**UserData** are a set of API routes to store and recover data.

You can find the documentation of the **Userdata** routes from the Swagger
interface, available at the path `/api/v1/#/userdata`.

## Add a **Userdata**

The POST route `/api/v1/users/data` allows you to add a **UserData**. This route takes up
A JSON object following:

```json
{
    "data_type": "string",
    "data_label": "",
    "data_comment": "",
    "data_group": "",
    "data_tool": "",
    "data_source": "",
    "data_content": {},
    "is_shared": false,
    "shared_profiles": [],
    "shared_users": [],
    "readwrite": false
}
```

| key               | description                                            | example                                             |
| ----------------- | ------------------------------------------------------ | --------------------------------------------------- |
| `data_type`       | The data type                                          | `SparqlQuery`                                       |
| `data_label`      | A label describing the data                            | `Requête SPARQL numéro 1`                           |
| `data_comment`    | A comment                                              | `Ceci est un commantaire`                           |
| `data_group`      | A group, to sort **UserData**                          | `Group1`                                            |
| `data_tool`       | _SousLeSens_ tool concerned by this data               | `Lineage`                                           |
| `data_source`     | The source concerned by this data                      | `GEMET`                                             |
| `data_content`    | The data                                               | `{"query": "SELECT * WHERE { ?s ?p ?o } LIMIT 10"}` |
| `is_shared`       | If the data is shared with other users or profiles     | `true`                                              |
| `shared_profiles` | List of profiles that can read or write the _UserData_ | `["profile1", "profile2"]`                          |
| `shared_users`    | List of users that can read or write the _UserData_    | `["bob", "alice"]`                                  |
| `readwrite`       | If the _UserData_ can be read or readwrite             | `false`                                             |

Once the _userdata_ has been added, the identifier of the resource is returned by the API.

## Read all _UserData_

The GET route `/api/v1/users/data` allows te get all _UserData_. The route return a list of objets
with all info exept the `data_content`.

The route return only the _UserData_ owned or shared.

The route takes optional query parameters to filter the results. For exemple,
with `data_type=sparqlQuery`, only _UserData_ with `data_type` `SparqlQuery`
will be returned.

## Get a _UserData_

The GET route `/api/v1/users/data/{id}` (replace `{id}` with a _UserData_ `id`)
return the corresponding _UserData_ with the `data_content`.

## Delete a _UserData_

The DELETE route `/api/v1/users/data/{id}` (replace `{id}` with a _UserData_
`id`) delete the corresponding _UserData_. Only owned or shared with
`readwrite` _UserData_ can be deleted.

## Execute a SPARQL query stored in a _UserData_

The GET route `/api/v1/users/data/{id}/exec` (replace `{id}` with a _UserData_)
will execute the `data_content` on the SPARQL server.
The _UserData_ `data_type` must be `sparqlQuery` and the `data_content` must be
an object with a `sparqlQuery` object containing the query. For example:

```json
{ "sparqlQuery": "SELECT * WHERE { ?s ?p ?o .} LIMIT 10" }
```

If you want to execute some query registred with KGquey, KGquery gives the link
of the API to request with the id of the query registred.

## Execute a SPARQL query template with HTTP query parameters

The `data_content` can contains variables with [jinja](https://jinja.palletsprojects.com/en/stable/)
syntax.

```jinja
{ "sparqlQuery": "SELECT * WHERE { <{{ subject }}> ?p ?o .} LIMIT 10" }
```

Use HTTP query parameters to replace the variable with a value :

```bash
curl http://sls.example.org/api/v1/users/data/1/exec?subject=http://sls.example.org/toto
```

Format parameter can be used to specify the format of the result. Default is `json`.

```bash
curl http://sls.example.org/api/v1/users/data/1/exec?subject=http://sls.example.org/toto&?format=csv
```

KGQuery saved queries return a link to this API to request with the id of the query registred.
For this kind of queries, limit and offset variables are added to the query automatically.

Use HTTP query parameters to replace the variable with a value :

```bash
curl http://sls.example.org/api/v1/users/data/1/exec?subject=http://sls.example.org/toto&limit=10&offset=0
```

By default, limit is set to 20000 and offset to 0.

