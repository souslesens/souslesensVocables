---
description: Write/upgrade Swagger apiDoc schemas for routes in api/v1/paths
---

# Swagger Schema Authoring — SousLeSens Vocables

Use when adding/updating a route under `api/v1/paths/**`, or upgrading vague responses (`schema: { type: "object" }`, `schema: {}`) to precise schemas.

## File anatomy

Every path module exports `operations` keyed by HTTP method. Each handler carries a `.apiDoc` block.

```js
import { processResponse } from "./utils.js";

export default function () {
    let operations = { GET, POST, DELETE, PUT };

    function GET(req, res, _next) { /* ... */ }

    GET.apiDoc = {
        summary: "<imperative one-liner>",
        description: "<2-5 sentences. WHY route exists + behaviour nuances + side-effects + auth quirks>",
        security: [{ restrictLoggedUser: [] }],         // or restrictQuota, restrictAdmin
        operationId: "<camelCaseUniqueId>",
        parameters: [ /* see below */ ],
        responses: { /* see below */ },
        tags: ["<single tag from existing set>"],
    };

    return operations;
}
```

Tags already in use: `Ontology`, `KG`, `JOWL`, `Axiom`, `Data`, `Sparql`, `Misc`, `Admin`, `Auth`, `Source`, `User`, `Profile`, `Database`, `Annotator`, `Plugin`. Reuse — do not invent.

## Parameters

### Query / path params

```js
{ name: "source", in: "query", type: "string", required: true,
  description: "Source name. Example: `IOF_core`." }
```

Rules:
- `required: true` only when handler crashes without it.
- Always include a concrete `Example: \`...\`` inside `description` (real source names: `IOF_core`, `GEMET`, real graph URIs).
- For JSON-encoded query params (e.g. `options`, `predicates`, `tables`), say so + give example string: `JSON-encoded options. Example: \`{"lines":50}\`.`
- Booleans passed as strings: type `string`, document `"true"` / `"false"` literals (codebase compares with `== "true"`).

### Body params

Single `body` param wrapping a typed object:

```js
{
    name: "body", in: "body", required: false,
    schema: {
        type: "object",
        properties: {
            source: { type: "string", description: "...", example: "IOF_core" },
            data: { type: "object", description: "...", example: { /* concrete */ } },
            options: { type: "object", properties: { /* ... */ }, example: { /* ... */ } },
        },
        example: { /* full payload mirroring properties */ },
    },
}
```

Add `"x-examples"` siblings when multiple realistic invocations exist (Swagger UI renders them as named scenarios).

## Responses — the non-negotiable rules

**No bare `schema: { type: "object" }`. No `schema: {}`. Ever.** A 200 must describe what the client actually parses.

Pattern by return shape:

### 1. Object with known keys

```js
200: {
    description: "<what is returned>",
    schema: {
        type: "object",
        properties: {
            headers: { type: "array", items: { type: "string" } },
            data: { type: "array", items: { type: "object", additionalProperties: true } },
        },
        example: { headers: ["id","label"], data: [{ id: "A1", label: "Asset 1" }] },
    },
},
```

### 2. Object with dynamic keys (URI-keyed dictionary, table-keyed map, ...)

```js
schema: {
    type: "object",
    additionalProperties: { type: "integer" },          // value type if uniform
    description: "Map `tableName → number of triples loaded`.",
    example: { "assets.csv": 4321 },
}
```

Or — when value shape is heterogeneous — `additionalProperties: true` + textual description naming the dynamic keys.

### 3. Free-form object (model cache, mapping doc, upstream passthrough)

```js
schema: {
    type: "object",
    additionalProperties: true,
    description: "<must explain WHAT the free-form payload represents and why the shape is open>",
    example: { /* one concrete instance */ },
}
```

Acceptable cases: cached ontology models, MappingModeler documents, JOWL upstream payloads, SPARQL endpoint passthrough.
Not acceptable: laziness when shape is actually known.

### 4. Arrays

```js
schema: {
    type: "array",
    items: { type: "string", description: "Class URI." },
    example: ["http://purl.obolibrary.org/obo/BFO_0000001"],
}
```

For arrays of objects: `items: { type: "object", properties: { /* ... */ } }` or `items: { type: "object", additionalProperties: true }` only when truly polymorphic.

### 5. Plain string / scalar return

```js
schema: { type: "string", description: "Raw file content as UTF-8 text.", example: "..." }
```

`dataController.readFile` returns a string — type it as `string`, not `object`.

### 6. SPARQL JSON Results passthrough

When proxying `application/sparql-results+json`:

```js
schema: {
    type: "object",
    additionalProperties: true,
    description:
        "SPARQL 1.1 JSON Results shape `{ head: { vars: [...] }, results: { bindings: [...] } }` " +
        "for SELECT queries. ASK / CONSTRUCT / DESCRIBE depend on requested format.",
}
```

### 7. No-op / stub handlers

Document explicitly:

```js
200: {
    description: "Empty response — handler is a no-op stub.",
    schema: { type: "object", additionalProperties: false,
              description: "Always empty. Use `POST /<route>` instead." },
}
```

## Inferring response shape — workflow

Before writing the schema, do this in order:

1. **Read the handler.** Find the `callback(null, X)` / `res.json(X)` / `processResponse(res, err, X)` site. `X` is the truth.
2. **Follow the controller.** If `X` comes from `dataController.readCsv(...)`, open `bin/dataController.js` and inspect the callback site there. Repeat until you hit a literal object construction.
3. **For GET routes only** — ping locally to confirm:
   ```bash
   curl -s -b /tmp/cookies.txt "http://localhost:3010/api/v1/<route>?<params>"
   ```
   Auth via `curl -c /tmp/cookies.txt http://localhost:3010/api/v1/auth/whoami` first. Available sources: `GEMET`, plus whatever `GET /api/v1/sources` returns.
4. **For POST/DELETE/PUT** — never ping (side effects). Infer from code only.
5. **Upstream-dependent routes** (JOWL `reasoner/*`, external SPARQL endpoints, plugins): describe the upstream contract textually. If the JOWL/Java service is down or unreachable, mark the schema `additionalProperties: true` with a note and flag to the reviewer that real shape needs verification.

## Examples — concrete real-world

Imitate these (extracted from current codebase):

**Counts map** ([api/v1/paths/kg/triples.js](../../api/v1/paths/kg/triples.js)):
```js
totalTriplesCount: {
    type: "object",
    additionalProperties: { type: "integer" },
    description: "Map `tableName → number of triples loaded`.",
}
```

**Aggregated mapping document** ([api/v1/paths/kg/assets/{name}.js](../../api/v1/paths/kg/assets/%7Bname%7D.js)):
```js
{
    type: "object",
    properties: {
        mappings: { type: "array", items: { type: "object", additionalProperties: true } },
        model: { type: "object", additionalProperties: true },
        relationalKeysMap: { type: "object", additionalProperties: true },
        data: { type: "object", additionalProperties: true },
        infos: { type: "object", additionalProperties: true },
    },
}
```

**Body example with x-examples** ([api/v1/paths/kg/triples.js](../../api/v1/paths/kg/triples.js)):
```js
{ name: "body", in: "body", required: false,
  schema: { type: "object", properties: { /* ... */ }, example: { /* ... */ } },
  "x-examples": {
      "Import maintenance CSV into IOF_core": { /* ... */ },
  },
}
```

## Error responses

Always document the realistic error codes the handler emits:

```js
responses: {
    200: { /* ... */ },
    400: { description: "Parse error.", schema: { properties: { error: { type: "string" } } } },
    403: { description: "User lacks `readwrite` access on the source." },
    404: { description: "Mapping not found." },
    500: { description: "Filesystem error." },
}
```

Match codes to the actual `res.status(...)` calls in the handler — do not stuff every code defensively.

## Description-writing rules

- Lead with the *why* / outward behaviour, not the implementation: "Returns axioms attached to `classUri`" beats "Calls JOWL".
- Mention upstream services explicitly: `JOWL`, `Virtuoso`, `Jena`, `ManchesterSyntaxEngine`, `KGcontroller`, `dataController`.
- Document silent error modes: `Returns 500 if the JOWL server is disabled.`
- Reference the companion route when relevant: `Reverse of \`manchesterAxiom2triples\`.`
- Backtick-quote symbol names, code, URLs, JSON keys.

## Validation

Express-openapi validates both request and response against the apiDoc. After editing:

```bash
node --check api/v1/paths/<file>.js
```

Then hit the route once and check the server log — a response that mismatches the declared schema logs an `responseValidator` error.

## Anti-patterns — reject in review

- `schema: { type: "object" }` with no `properties` / no `additionalProperties`.
- `schema: {}`.
- Missing `description` on a free-form `additionalProperties: true` object.
- `200` declared without an example when the shape is non-obvious.
- Inventing tags instead of reusing the existing set.
- Documenting `additionalProperties: true` when the keys are actually known and small in number.
- Copying another route's schema without verifying the underlying controller really returns that shape.

## When invoked

When the user runs `/swagger-schema [path/to/route.js]`:

1. If a path is supplied, read it; otherwise grep recently changed `api/v1/paths/**` files for vague schemas (`schema:\s*\{\s*type:\s*["']object["']\s*\}` and `schema:\s*\{\s*\}`).
2. List the affected routes with file + line + HTTP method.
3. For each: read the handler, follow the controller, ping if GET, infer if POST/DELETE/PUT.
4. Apply the upgrades inline using `Edit`.
5. Flag any route whose upstream (JOWL, external SPARQL) is unreachable so the user can verify shapes later.
6. End with `node --check` on every touched file.
