# Current Task: Split SPARQL Queries API Routes

## Plan

- [x] Inspect existing `/sparqlQueries` handlers and callers.
- [x] Extract shared registry/execution helpers.
- [x] Add `/sparqlQueries/catalog`, `/sparqlQueries/run`, and `/sparqlQueries/codeRequest`.
- [x] Keep legacy `/sparqlQueries` behavior compatible unless safely obsolete.
- [x] Run focused syntax checks and review the diff.

## Review

- Added explicit SPARQL query API endpoints:
    - `GET /api/v1/sparqlQueries/catalog`
    - `POST /api/v1/sparqlQueries/run`
    - `POST /api/v1/sparqlQueries/codeRequest`
- `run` forces `returnQueryStr: false`; `codeRequest` forces `returnQueryStr: true`; the body no longer exposes that toggle in Swagger.
- Legacy `GET/POST /api/v1/sparqlQueries` remains compatible for existing callers.
- Verification: `node --check` passed for all touched route files; `node -e "import('./app.js')..."` passed.

---

# Current Task: Put SPARQL Queries In Its Own Swagger Group

## Plan

- [x] Add a dedicated Swagger tag for shared SLS SPARQL query routes.
- [x] Move shared handlers outside `api/v1/paths` so helpers do not create a legacy route.
- [x] Retag `catalog`, `run`, and `codeRequest` into the new Swagger group.
- [x] Delete the old `/api/v1/sparqlQueries` route.
- [x] Run syntax, format, and app import checks.

## Review

- Added the `Sparql queries` Swagger tag with a sharing-oriented description for cataloged SLS SPARQL queries.
- Moved shared route logic into `api/v1/controllers/sparqlQueries.js`.
- Removed legacy `GET/POST /api/v1/sparqlQueries`; only `catalog`, `run`, and `codeRequest` remain.
- Verification: `node --check`, Prettier check, `app.js` import, and `Select-String` route/tag search passed.

---

# Current Task

## Plan

- [x] Show `Column`, `VirtualColumn`, `RowIndex`, and `URI` mapping-node edges to `Class` nodes under `Relations`.
- [x] Preserve existing column-to-column relation display and selection behavior.
- [x] For create/sample, translate mapping-node to `Class` relation selections to `columnId>predicate` filters so backend column mappings can generate them.
- [x] For delete-specific, send a dedicated `ClassRelation` filter carrying subject RDF type, predicate, and target class URI.
- [x] Add backend delete/sample support for `ClassRelation`.
- [x] Run focused syntax/static checks and record result.

## Review

- Updated `tripleFactory.js` filter tree to include mapping-node to `Class` `rdf:type` / `rdfs:subClassOf` relations.
- Save/sample now sends `columnId>predicate` for those class relations, while existing column-to-column relations still send `edge.id`.
- Delete-specific now sends `ClassRelation` filters for mapping-node to `Class` edges.
- Backend delete/sample supports `ClassRelation` with subject RDF type, predicate, and target class constraints.
- Verification: `node --check` passed for both modified JS files; `npx prettier --check` passed for both modified JS files.

---

# Current Task: Restore SHACL Form OpenAPI Fix

## Plan

- [x] Read project and OpenAPI schema guidance.
- [x] Locate `/shaclForm` apiDoc validation failure.
- [x] Find prior commit that fixed the same route.
- [x] Restore the body-parameter schema.
- [x] Run focused validation checks.

## Review

- Restored the previous `/shaclForm` OpenAPI fix from commit `d7db18dae`: POST now declares one `body` parameter with a schema for `triples` and `shapes`.
- Verification: `node --check api/v1/paths/shaclForm.js`, `npx prettier --check api/v1/paths/shaclForm.js`, and `node -e "import('./app.js')..."` all passed.

---

# Current Task: Fix Class Relation Filter Targets

## Plan

- [x] Inspect MappingModeler relation filter flow and KG triple generation.
- [x] Send class-relation create/sample filters with target class URI.
- [x] Filter generated mappings by predicate and object target.
- [x] Preserve `rdf:type owl:Class` when selected `rdfs:subClassOf` needs the class declaration.
- [ ] Run focused syntax/static checks.

## Review

- Pending.
