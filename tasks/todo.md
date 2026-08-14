# maxTriplesPerSource et maxTriplesTotal

Branche `feat/max-triples-quota`, partie de `OK_2026_06_30` après les deux commits v1
sur les droits de création de sources.

## Acquis de l'analyse

Le compteur persisté est abandonné. Mesures faites par Karim sur Virtuoso :
`SELECT COUNT(*)` sur une source de 8M de triplets répond en 0,49 s, et le
`GROUP BY ?g` sur tous les graphes d'un store de plusieurs millions de triplets
répond en moins d'une seconde. Le contrôle se fait donc par requête, à condition
de la placer une fois par opération et non par lot de 200 triplets.

## Arbitrages à confirmer

### 1. Niveau des deux variables

Le document d'offre les annonce en « profil + user ». Proposition : profil
seulement pour cette itération.

Raison : le niveau user n'existe pour la création de sources que par héritage
historique. Pour les triplets, rien n'existe côté compte, et un plafond de
volume par compte n'a pas de sens dans une logique de palier, c'est l'offre qui
le fixe. Ajouter le niveau user coûte deux colonnes sur `users`, le zod, les
converts, l'écran UsersTable et les tests, pour un levier sans usage identifié.

Le résolveur sera écrit de façon à accepter le repli compte plus tard sans
retouche des points d'application, comme `resolveSourceCreationRights`.

### 2. Points d'application couverts

Trois familles d'écriture, de coût de mise en oeuvre très différent.

| Chemin | Volume | Nb de triplets connu avant écriture | Effort |
|---|---|---|---|
| `KGbuilder_triplesWriter.writeTriples` | fort, MappingModeler et KGcreator | oui, `allTriples.length` | faible |
| `rdf/graph.js` POST, chargement de fichier | fort | non, `LOAD` délégué à Virtuoso | moyen, graphe d'attente |
| `sparqlProxy.js` POST, écritures du navigateur | faible, édition unitaire | non pour `INSERT ... WHERE` | faible mais contrôle approximatif |

Proposition : les trois, dans cet ordre.

Limite assumée sur le troisième : pour un `INSERT { } WHERE { }` le nombre de
triplets produits n'est connu qu'après exécution. La règle ne peut donc être que
« refuser toute écriture si le graphe est déjà au plafond », pas un pré-comptage
exact. Un dépassement borné à une opération reste possible.

## Plan

- [ ] Colonnes `max_triples_per_source` et `max_triples_total` sur `profiles`, vue `profiles_list`, migration
- [ ] Champs zod, `_convertToDatabase`, `_convertToLegacy` dans `model/profiles.js`
- [ ] `getTriplesLimitsForUser` sur le modèle profil, plus permissif entre profils, undefined si aucun profil ne définit
- [ ] Comptage multi-graphes sur `rdfDataModel`, une requête avec `VALUES ?g`
- [ ] Module de contrôle unique, entrée `(user, graphUri, nbTripletsEntrants)`, sortie null ou motif de refus
- [ ] Application dans `KGbuilder_triplesWriter.writeTriples`
- [ ] Application dans `rdf/graph.js` POST par graphe d'attente, `LOAD` puis `COUNT` puis `ADD` ou `DROP`
- [ ] Application dans `sparqlProxy.js` POST sur les opérations d'écriture
- [ ] Section Limitations du ConfigEditor, deux champs dans le groupe Triples
- [ ] Tests unitaires sur la résolution et sur le module de contrôle
- [ ] Mesure du coût du `ADD` entre graphes, seule inconnue restante

## A mesurer avant de retenir le graphe d'attente

Le coût de `ADD <staging> TO <cible>` sur plusieurs millions de triplets n'est
garanti par aucune spécification. Si la mesure est mauvaise, repli sur un
parseur en streaming côté Node, ou sur les procédures Virtuoso `TTLP` et
`rdf_loader_run`, au prix de la portabilité.
