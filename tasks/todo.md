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
