# Impact des travaux MCP sur le code SLS pre existant

Document de synthese: ce qui a reellement change dans le code SLS historique
(sparql_OWL, sparql_generic, sparql_SKOS, lineage, widgets, backend) depuis le
demarrage du chantier MCP.

## Perimetre et methode

Plage analysee: `d62b8c405~1..HEAD`, soit du premier commit MCP
(`d62b8c405 feat(mcp): read-only MCP server whose catalog is derived from the code`,
2026-08-11) jusqu'a `9b0ba471d` (2026-09-04).

Sont volontairement exclus de ce document:

- les fichiers nouveaux propres au MCP (`bin/MCP/*`, `api/v1/paths/sparql/select.js`,
  `bin/endpointLimits.js`, les tests `tests/jest/mcp.*`, `scripts/tests/test-mcp-*`)
- `bin/remoteCodeRunner.js`, qui est la couche d'execution du MCP
- les blocs `x-mcp` ajoutes dans les apiDoc des routes
- les annotations JSDoc de catalogue (`@expose read` / `@expose write`, `@mcpTool`,
  `@mcpFixed`) et les reecritures de texte de JSDoc
- `bin/sparqlRegistry.json` et `bin/sparqlRegistryExtractor.js`, qui sont la chaine
  de generation du catalogue

Ne restent donc ci dessous que les modifications de comportement du code SLS existant.

Le diff correspondant, filtre selon les memes regles, est dans
[impact-mcp-sur-sls-existant.diff](tasks/impact-mcp-sur-sls-existant.diff) (26 fichiers,
coloration syntaxique automatique dans VSCode). Il est fait pour etre lu, pas applique:
les compteurs des en-tetes `@@` sont ceux du diff complet, avant filtrage des hunks.

---

## 1. Corrections de bugs reels

### 1.1 Erreurs de reference dans lineage_whiteboard

[lineage_whiteboard.js](public/vocables/modules/tools/lineage/lineage_whiteboard.js)

- `drawObjectProperties` lisait une variable `excludeRelationsFromPhysic` jamais
  declaree (elle etait affectee sous le nom `graphSpatialisation`). Toute la branche
  levait une `ReferenceError`. La variable a ete renommee correctement.
- Toujours dans `drawObjectProperties`, la branche `getObjectPropertiesDomainAndRange`
  appelait `drawProperties(result)` sans `self.`, donc une `ReferenceError` a chaque
  passage.
- `graphNodeNeighborhood` appelait `graphNodeNeighborhoodRanges(nodeData)` sans `self.`,
  meme probleme.
- `removeFromGraph` (menu contextuel, selection multiple) faisait
  `network.getConnectedEdges(nodesSelected[i].id)`. `getSelectedNodes()` renvoie des
  identifiants, pas des objets: `.id` valait `undefined` et **aucune arete connectee
  n'etait supprimee**. Les aretes orphelines restaient dans le dataset, invisibles mais
  comptees et sauvegardees. Corrige via la nouvelle fonction `removeNodesFromWhiteboard`.
- `saveWhiteboard` et `exportWhiteboard` dupliquaient la serialisation du whiteboard et
  avaient une structure de blocs cassee. Les deux passent maintenant par
  `serializeWhiteboard()`.

### 1.2 Export CSV silencieusement corrompu

[export.js](public/vocables/modules/shared/export.js)

`exportDataToCSV` entourait chaque cellule de guillemets sans doubler les guillemets
presents dans la donnee. Consequences observees:

- une definition contenant `valve dite "papillon"` ressortait en `valve dite papillon`
- si un separateur `;` tombait entre deux guillemets de la donnee, le parseur coupait le
  champ et **toutes les colonnes suivantes se decalaient d'un cran**

Les deux echecs etaient silencieux, le fichier s'ouvrant sans erreur. La fonction accepte
en plus un `fileName` optionnel.

### 1.3 URL ignoree dans sparql_generic

[sparql_generic.js](public/vocables/modules/sparqlProxies/sparql_generic.js)

`getEndPointAllGraphsMap` passait une variable globale `url` inexistante a
`querySPARQL_GET_proxy` au lieu de son propre parametre `sparqlServerUrl`. La fonction ne
pouvait pas cibler un endpoint autre que celui par defaut.

### 1.4 Controle d'acces Elasticsearch casse cote backend

[userRequestFiltering.js](bin/userRequestFiltering.js)

`validateElasticSearchIndices` lisait `source.accessControl` alors que `source` etait la
**cle** de la boucle `for ... in`, donc une chaine. Tout index etait classe en lecture
seule, et **toute validation `acl == "w"` echouait**. Corrige en lisant la valeur de la map.

### 1.5 Export global

[containers_graph.js](public/vocables/modules/tools/containers/containers_graph.js)

`window.Container_graph` corrige en `window.Containers_graph` (faute de frappe qui cassait
les appels depuis le HTML inline).

---

## 2. Requetes SPARQL modifiees (changement de resultats)

Ces changements modifient ce que le triple store renvoie, y compris pour l'UI classique.

### 2.1 Noeuds blancs exclus de la taxonomie

[sparql_OWL.js](public/vocables/modules/sparqlProxies/sparql_OWL.js) `getNodeChildren`

Ajout de `FILTER (!isBlank(?child1))` et du meme filtre sur chaque `?childN` des niveaux
suivants. Les enfants noeuds blancs (expressions de classes, restes laisses par les
imports) ne remontent plus dans les arbres.

### 2.2 Comptage des classes: expressions anonymes exclues

[ontologyModels.js](public/vocables/modules/shared/ontologyModels.js)

Le `count(distinct ?sub)` sur `?sub rdf:type owl:Class` comptait les noeuds anonymes.
Ajout d'un filtre `namedClassFilter` (`!isBlank`, `!STRSTARTS(..., 'nodeID://')`,
`!STRSTARTS(..., '_:')`) applique au comptage **et** a la requete de chargement des
classes. Impact direct: `classesCount` change, donc le seuil
`Config.ontologyModelMaxClasses` ne se declenche plus au meme moment.

### 2.3 getNodesAncestorsOrDescendants: feuilles conservees

[sparql_OWL.js](public/vocables/modules/sparqlProxies/sparql_OWL.js)

Reecriture de la branche `descendants`:

- le motif `?superClassSubClass rdfs:subClassOf ?class` passe en `OPTIONAL` place **apres**
  le sub select, ce qui conserve les feuilles dans le resultat (avant, une classe sans
  enfant disparaissait)
- le modifieur devient `rdfs:subClassOf*` en dur pour ancrer la recursion sur la racine
- `?subject rdfs:subClassOf|rdf:type ?class` passe en `OPTIONAL`
- cote JS, la reconstruction des hierarchies teste desormais `item.superClassSubClass`
  avant de l'utiliser (ligne feuille)

**Rupture de contrat**: le callback ne renvoie plus `rawResult`. Il renvoie
`{hierarchies}` seul, au lieu de `{hierarchies, rawResult}`. Tout appelant qui lisait
`rawResult` est casse.

### 2.4 getObjectRestrictions: metadonnees en OPTIONAL

[sparql_OWL.js](public/vocables/modules/sparqlProxies/sparql_OWL.js)

Avec `options.getMetadata`, les six predicats de metadonnees (`bibo:status`,
`dcterms:created`, `dcterms:creator`, `dcterms:source`, `domainSourceLabel`,
`rangeSourceLabel`) etaient obligatoires et joints en dur. Une restriction n'en portant
aucune, ou n'en portant qu'une partie, **ne remontait pas du tout**. Ils sont desormais
chacun dans leur propre `optional`.

### 2.5 getFilteredTriples: deux clauses qui n'etaient jamais ajoutees

[sparql_OWL.js](public/vocables/modules/sparqlProxies/sparql_OWL.js)

```javascript
// avant: expressions sans effet, la chaine etait evaluee puis jetee
if (options.onlyObjectProperties) {
    (" ?prop rdf:type owl:ObjectProperty.");
} else if (options.onlyDataTypeProperties) {
    (" filter (isLiteral(?object) )");
}
```

Les options `onlyObjectProperties` et `onlyDataTypeProperties` etaient donc **sans effet
depuis leur ecriture**. Elles concatenent maintenant reellement dans `query`.

### 2.6 getObjectPropertiesDomainAndRange: option supprimee

[sparql_OWL.js](public/vocables/modules/sparqlProxies/sparql_OWL.js)

- l'option `options.inheritedProperties` a ete supprimee: elle ouvrait une accolade
  `{ ?prop rdfs:subPropertyOf*/rdf:type owl:ObjectProperty` jamais refermee, donc une
  requete invalide
- la duplication des deux branches `owl:DatatypeProperty` / `owl:ObjectProperty` est
  remplacee par une variable `propertyType`

### 2.7 Profondeur des chemins de propriete bornee

Trois endroits passent d'une fermeture transitive illimitee a une profondeur bornee, pour
eviter les explosions cote Virtuoso:

- [subGraph.js](public/vocables/modules/shared/subGraph.js): `rdfs:subClassOf+` devient
  `rdfs:subClassOf{1,5}`
- [_commonBotFunctions.js](public/vocables/modules/bots/_commonBotFunctions.js)
  `showParentsDialog`: `rdfs:subClassOf*` devient `rdfs:subClassOf{0,5}`
- `getNodesAncestorsOrDescendants` documente desormais `rdfs:subClassOf{0,5}`

**Attention**: au dela de 5 niveaux, les ancetres ne remontent plus. C'est un changement de
resultat visible dans l'UI sur les ontologies profondes.

### 2.8 Indexation Elasticsearch des individus

[searchUtil.js](public/vocables/modules/search/searchUtil.js)

Le filtre d'indexation des individus passe de:

```
?id rdf:type ?type. ?type rdf:type owl:Class
```

a:

```
GRAPH <graphUri> {?id rdf:type ?type} . ?type rdf:type owl:Class
```

avec `withoutImports` passe de `true` a `false`. `?id` est verrouille sur le graphe propre
de la source, donc les individus des sources importees ne sont plus indexes en double,
tandis que `?type` reste non scope pour qu'une classe definie dans un import valide quand
meme le type de l'individu.

---

## 3. Backend: securite, erreurs et API

### 3.1 Filtrage SPARQL: nouveau discriminateur SELECT

[userRequestFiltering.js](bin/userRequestFiltering.js)

Nouvelle fonction publique `isSelectQuery(query)`, extraite de `filterSparqlRequest`, avec
deux durcissements:

- le prologue reconnu inclut desormais `BASE`, pas seulement `PREFIX` (une requete avec
  `BASE` etait routee vers la branche update et refusee comme une ecriture)
- un update chaine derriere le SELECT par `;` (`SELECT ... ; INSERT ...`) est refuse.
  Ce cas n'etait couvert nulle part: `filterSparqlRequest` sort tot pour les admins et
  n'atteint jamais `checkSelectQuery`

Les regex inline ont ete extraites en constantes nommees.

### 3.2 Listing des index Elasticsearch filtre par droits

[indices.js](api/v1/paths/elasticsearch/indices.js)

`GET /elasticsearch/indices` renvoyait tous les index du cluster. Il renvoie maintenant
l'intersection avec les sources lisibles par l'appelant. Motif: un index sans source
correspondante n'est pas ignore par `validateElasticSearchIndices`, il fait **rejeter la
requete multi index entiere**. Le code mort `await indexModel.getIndices()` appele deux
fois a ete supprime au passage.

Note: c'est un changement de contrat visible pour tout client de cette route, pas
seulement pour le MCP.

### 3.3 Messages d'erreur SPARQL exploitables

[sparqlQueriesRunner.js](bin/sparqlQueriesRunner.js) et
[controllers/sparqlQueries.js](api/v1/controllers/sparqlQueries.js)

Nouvelle fonction exportee `describeExecutionError(executionError)`. La couche SPARQL
remonte une erreur sous trois formes (`Error`, corps brut du triple store en chaine,
`{responseText}` du shim ajax serveur). Seule la premiere porte `message`, donc lire
`message` seul transformait toute erreur de syntaxe Virtuoso en `[object Object]` et
perdait la phrase qui dit quoi corriger.

### 3.4 Codes HTTP corriges

- [data/file.js](api/v1/paths/data/file.js): fichier absent renvoie `404` au lieu de `500`
- [ontologyModels.js](api/v1/paths/ontologyModels.js): modele non trouve renvoie `404` avec
  un message explicite, au lieu de `500 "no data"`

---

## 4. Extensions d'API JS (nouvelles signatures, retrocompatibles)

Ces fonctions ont recu un `callback` optionnel, pour pouvoir etre pilotees depuis une
boucle d'agent. Toutes les sorties anticipees repondent maintenant au callback, y compris
celles qui se contentaient d'ecrire un message UI.

| Fichier | Fonction | Ajout |
|---|---|---|
| lineage_whiteboard.js | `drawSimilarsNodes` | `callback` (5e arg) |
| lineage_whiteboard.js | `drawObjectProperties` | `callback` (4e arg) |
| lineage_whiteboard.js | `drawProperties` | `source` (2e arg), avec repli `item.source` puis source active |
| lineage_whiteboard.js | `drawNodesAndParents` (chemin `drawNodeChildren`) | reponses sur toutes les sorties anticipees |
| lineage_whiteboard.js | `drawInferredClassesModel` | `callback` (2e arg) |
| lineage_properties.js | `drawRangeAndDomainsGraph` | `callback` (5e arg) |
| nodeInfosAxioms.js | `init` | `callback` (4e arg) |
| searchWidget.js | recherche | le callback est appele apres construction du jstree, plus seulement avant |
| lineage_createResource.js | `startCreateRessourceBot` | parametre `prefill` |
| export.js | `exportDataToCSV` | parametre `fileName` |

Un bug de callback jamais appele a ete corrige dans `lineage_whiteboard`: quand le premier
noeud etait deja dessine, la fonction faisait `return self.zoomGraphOnNode(...)` sans
appeler le callback, laissant tout appelant en attente indefinie.

### Nouvelles fonctions publiques

[lineage_whiteboard.js](public/vocables/modules/tools/lineage/lineage_whiteboard.js)

- `serializeWhiteboard()` : etat du whiteboard en objet simple, mutualise entre save,
  export et snapshot
- `isWhiteboardDrawn()`
- `removeNodesFromWhiteboard(nodeIds)` : retire les noeuds **et** leurs aretes connectees,
  puis redessine la legende
- `openLineageTab(tabName, buttonClicked)` avec la table `lineageTabs`
- `saveWhiteboardSnapshot()` / `restoreWhiteboardSnapshot()` : un seul niveau d'annulation
- `getWhiteboardContext()` : onglet actif, source active, sources chargees, compteurs. Lit
  les deux selections (celle de vis.js et celle de `Lineage_selection`), car lire la
  seconde seule signalait zero noeud selectionne alors que des noeuds etaient bien
  surlignes

[VisjsGraphClass.js](public/vocables/modules/graph/VisjsGraphClass.js)

- `normalizeNodeLevels(pendingNodes)` : donne un niveau `-1` aux noeuds qui n'en ont pas.
  Vis.js refuse un layout hierarchique sinon (`nodes require either no predefined levels or
  levels have to be defined for all nodes`). Appele automatiquement dans `setLayout` pour
  les deux layouts hierarchiques. La logique de nivellement inline de
  `Lineage_whiteboard.addVisDataToGraph` a ete remplacee par cet appel.

[graphDecorationWidget.js](public/vocables/modules/uiWidgets/graphDecorationWidget.js)

- `applyDecoration(nodes, color, shape, size)` extraite de `decorateNodes`, renvoie le
  nombre de noeuds restyles

[sourceSelectorWidget.js](public/vocables/modules/uiWidgets/sourceSelectorWidget.js)

- `refuseReadOnlySourceForMappingModeler(source, tool)` : alerte et refuse une source en
  lecture seule pour MappingModeler. Appelee dans `onSourceSelect` et dans
  [mappingModeler.js](public/vocables/modules/tools/mappingModeler/mappingModeler.js)
  `onLoaded`, car la source peut aussi arriver par URL ou par changement d'outil

---

## 5. Changement de comportement UI notable

### 5.1 Legende de l'ontologie superieure

[lineage_whiteboard.js](public/vocables/modules/tools/lineage/lineage_whiteboard.js)
`addVisDataToGraph`

Ajout de `Lineage_decoration.decorateNodeAndDrawLegend(visjsData.nodes)` sur chaque ajout.
Avant, la legende n'etait appliquee qu'au premier dessin, donc un tableau construit par
ajouts successifs finissait a moitie decore.

### 5.2 Bot de creation de ressource: etapes preremplies

[createResource_bot.js](public/vocables/modules/bots/createResource_bot.js)

Nouveau mecanisme `usePrefilledStep(paramName, stepMessage)` et map `self.prefilledParams`.
Une etape dont la reponse arrive dans les parametres de demarrage est ecrite dans la
conversation et sautee, une seule fois.

Le point delicat est traite: l'etape est enregistree dans `history.step` et
`history.VarFilling` du moteur de bot, exactement comme le ferait une vraie reponse. Sans
cet enregistrement, le bouton Precedent sautait par dessus l'etape **et par dessus toutes
les autres etapes non enregistrees**, revenant deux ou trois questions trop loin.

### 5.3 Dock chatbot dans le panneau lateral de Lineage

Ajout d'un conteneur `#lineage_chatbotDock` en bas de
[lateralPanel.html](public/vocables/modules/tools/lineage/html/lateralPanel.html), hors des
onglets, plus `mountChatbotPlugin` / `makeChatbotDockResizable` / `unloadChatbotPlugin`
dans `lineage_whiteboard`, plus le style de poignee dans
[lineageSkin.css](public/vocables/modules/tools/lineage/css/lineageSkin.css).

Montage par test de capacite (`Config.userTools["sls-chatbot"]`), pas par import: le dock
reste vide sur une instance sans le plugin. `unloadChatbotPlugin` est appele au
dechargement de Lineage, sinon un agent encore en cours continue d'ecrire dans un panneau
supprime.

---

## 6. Changements arrives dans la meme plage mais hors chantier MCP

Pour memoire, ces travaux sont dans la meme fenetre de commits mais sans lien avec le MCP:

- **Quotas par profil** (`b403361e8`, `b379617d6`, migrations SQL): suppression des champs
  de quota par utilisateur, resolution depuis les profils uniquement, admins exemptes,
  refus par defaut. Touche `model/users.js`, `model/profiles.js`, `bin/user.js`,
  `mainapp/src/*`, schema SQL.
- **Protection de charge Virtuoso** (`a21185728`, `dcefe0585`, `9a7a67e80`, `f4b08f863`):
  middleware `restrictVirtuosoLoad`, metriques `virtuoso_sparql_load` et
  `virtuoso_sparql_pending_queries`, seuil `maxVirtuosoLoad` par profil, reglage dans
  ConfigEditor. Instrumente [httpProxy.js](bin/httpProxy.js) (`trackVirtuosoRequest` /
  `endVirtuosoRequest` autour de `get` et `post`) et [rdfData.js](model/rdfData.js).
  Ajoute `restrictVirtuosoLoad` sur les routes RDF et `kg/clearGraph`.
- **Export CSV du controle d'acces des profils** (`cd96969f9`).
- **Refactoring KGbuilder** (`c2063a612`): `readAndProcessData` passe en generateur async
  dans [triplesMaker.js](bin/KGbuilder/triplesMaker.js), 451 lignes touchees, avec
  `bin/_csvCrawler.js` et une nouvelle suite `tests/jest/triplesMaker.test.js`.
- **Chaine LLM** (`5e3482a64`, `a44b2d0d2`, `300e1a8fb`, `ef357428a`): adaptateurs
  OpenRouter et Anthropic, `bin/AI/normalizeCompletion.js`, route `/ai/complete` passee
  derriere admin, `llm.<provider>.maxTokens` seule autorite sur la taille de sortie.

---

## 7. Points de vigilance

1. **`getNodesAncestorsOrDescendants` ne renvoie plus `rawResult`.** Verifier qu'aucun
   appelant hors `OntologyModels` ne l'utilisait.
2. **Profondeur bornee a 5 niveaux** dans `subGraph.js` et `showParentsDialog`. Sur une
   ontologie profonde, les ancetres au dela du 5e niveau ne remontent plus.
3. **`options.inheritedProperties` supprime** de `getObjectPropertiesDomainAndRange`. Un
   appelant qui la passait ne recevra plus d'erreur, mais un resultat different (il
   recevait de toute facon une requete invalide).
4. **`GET /elasticsearch/indices` renvoie moins d'index qu'avant.** Tout client externe qui
   attendait la liste complete du cluster voit un changement.
5. **`classesCount` d'`OntologyModels` a baisse** sur les sources contenant des expressions
   de classes anonymes, ce qui change le declenchement du seuil
   `Config.ontologyModelMaxClasses`.
6. **`onlyObjectProperties` et `onlyDataTypeProperties` de `getFilteredTriples` sont
   maintenant actives.** Un appelant qui les passait sans le savoir voyait auparavant tous
   les triples; il en verra desormais un sous ensemble.
