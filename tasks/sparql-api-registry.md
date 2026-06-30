# Exposer les requêtes SPARQL en API REST

> Document de conception, à valider. Objectif : exposer les fonctions de requêtes SPARQL du frontend via une API REST documentée dans Swagger, sans réécrire la logique existante.

Aujourd'hui, ~128 fonctions de requêtes (`getNodeChildren`, `getNodeInfos`, `getObjectProperties`, etc.) sont définies dans le **frontend**, dans `public/vocables/modules/sparqlProxies/`.

Chaque fonction construit une chaîne SPARQL, puis l'envoie au backend via **un unique endpoint générique** : `/api/v1/sparqlProxy`. Et récupère les résultats en les traitant.

## 2. L'objectif

Exposer ces requêtes via une API REST documentée dans Swagger UI, avec deux contraintes fortes :

1. Ne **pas dupliquer** la logique de construction des requêtes (les fonctions du frontend restent la seule source).
2. Ne **pas écrire 128 fichiers de route à la main** (le routage est centralisé, le registre est généré).

## 3. L'API : deux routes, pas N routes

> **Changement de cap par rapport à la version précédente.** On n'expose **pas** une route par requête. On expose **deux routes** qui s'appuient sur un registre :
>
> - **`GET /api/v1/sparqlQueries`** → retourne la **liste des requêtes disponibles** (le registre : nom, module, description, paramètres, schéma de réponse).
> - **`POST /api/v1/sparqlQueries`** → **exécute une requête** désignée par son nom, avec ses paramètres.

Le registre reste la **source de vérité** : il alimente la doc Swagger (description des deux routes + énumération des requêtes disponibles dans le payload de la route POST) et sert au routage/validation interne de la route POST.

### Route POST — corps de la requête

```jsonc
{
  "name": "getNodeChildren",        // requête à exécuter (clé du registre)
  "module": "Sparql_OWL",
  "params": {                        // paramètres de la fonction
    "source": "ISO_15926-part-14_PCA",
    "nodeId": "http://..."
  },
  "returnQueryStr": false            // optionnel, défaut false
}
```

### Le paramètre `returnQueryStr`

Booléen, **`false` par défaut**.

- `false` → comportement normal : la requête est **exécutée**, le résultat SPARQL est retourné.
- `true` → la requête **n'est pas exécutée** : on retourne uniquement la **chaîne SPARQL construite** (string).

**Point d'injection unique : `querySPARQL_GET_proxy`.** Toutes les fonctions de requête finissent par appeler `Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, options, callback)` ([sparql_proxy.js:51](public/vocables/modules/sparqlProxies/sparql_proxy.js#L51)). C'est le **chokepoint** par lequel tout passe. On y branche `returnQueryStr` :

- la route POST injecte `returnQueryStr` dans l'objet `options` qui parvient à `querySPARQL_GET_proxy` ;
- au début de `querySPARQL_GET_proxy`, si `options.returnQueryStr === true`, on **court-circuite** avant le `$.ajax` et on renvoie la query construite via le callback : `return callback(null, { query: query })`.

Avantage : un **seul endroit** à modifier pour couvrir les 128 fonctions, exécution comme retour-de-string suivent strictement le même chemin.

> **Point à régler — propagation de `options`.** `returnQueryStr` doit atteindre l'`options` reçu par `querySPARQL_GET_proxy`. Toutes les fonctions ne forwardent pas un `options` qu'on contrôle. À cadrer pendant l'implémentation : soit propagation via le contexte d'exécution (remoteCodeRunner, par appel), soit normalisation de la signature au point d'injection. *(Détail à valider sur 2-3 fonctions réelles avant de généraliser.)*

## 4. Le registre (source de vérité)

Un **descripteur par requête** : objet de config décrivant la fonction.

```js
{
  name: "getNodeChildren",
  module: "Sparql_OWL",
  description: "...",
  params: [
    { name: "source", type: "string", required: true },
    // ... autres paramètres
  ],
  responseSchema: "#/definitions/SparqlQueryResponse",
  expose: true
}
```

Sorties du registre :

- la route **`GET`** sert le registre (filtré sur `expose: true`) ;
- la route **`POST`** l'utilise pour **valider** les paramètres entrants et **router** vers la bonne fonction.

## 5. Génération automatique du registre (AST + JSDoc)

Remplir 128 descripteurs à la main serait fastidieux et vite désynchronisé. On génère le **squelette du registre** par **analyse statique** (sans exécuter le code).

| Donnée extraite | Source | Couverture |
|---|---|---|
| Nom de la fonction, paramètres, arité, position du `callback` | Analyse de l'AST | **100 %** |
| Description, types précis, schéma de réponse, exemples, drapeau `expose` | Commentaires JSDoc enrichis | dépend de la JSDoc écrite sur chaque fonction |

Outils envisagés : `acorn` ou `espree` pour l'AST (motif `self.NOM = function`), et `comment-parser` pour les blocs JSDoc.

**Tout passe par la JSDoc.** Pas de fichier d'override séparé : types, schéma de réponse, exemples, `expose` vivent dans le bloc JSDoc, à côté de la fonction.

```js
/**
 * Récupère les enfants directs d'un nœud.
 * @param {string} source - nom de la source
 * @param {string} nodeId - URI du nœud parent
 * @responseSchema #/definitions/SparqlQueryResponse
 * @example getNodeChildren("ISO_15926", "http://...")
 * @expose
 */
self.getNodeChildren = function (source, nodeId, options, callback) { ... }
```

- l'**AST garantit la complétude** : noms et paramètres jamais désynchronisés ; signale les fonctions sans JSDoc ;
- la **JSDoc est la seule source du complément** : enrichir = éditer le bloc JSDoc. Source unique.

```
AST       ──> noms, params, arité (complet, jamais désynchronisé)
JSDoc     ──> description, types, responseSchema, examples, expose
        ▼
   registre final ──> GET (liste)  +  POST (validation + routage)
```

## 6. Exécution via remoteCodeRunner (réutilise le code frontend)

`bin/remoteCodeRunner.js` sait **déjà** faire tourner du code frontend dans Node. Il :

- mocke `window` et `$` (jQuery) ;
- redirige les appels `$.ajax` vers `/sparqlProxy` ;
- charge `Config` et les sources ;
- applique `UserRequestFiltering` → **contrôle d'accès préservé**.

La route POST appelle donc directement `Sparql_OWL.getNodeChildren(...)` **tel quel**, sans réécriture.

Points bloquants à régler :

1. **La concurrence.** Variables globales au niveau module (`activeCallback`, `currentUserContext`) non sûres en concurrence. Refactorer en **contexte propre à chaque appel**. *(Non négociable.)* C'est aussi le canal pour propager `returnQueryStr` proprement (voir §3).
2. **La garde « plugins uniquement ».** `runUserDataFunction` refuse tout chemin hors `plugins/`. Ajouter `runVocablesFn` autorisant `public/vocables/modules/`.

## 7. Schéma d'ensemble

```
registre (auto AST+JSDoc)
   ├──> GET  /api/v1/sparqlQueries  → liste des requêtes disponibles (Swagger)
   └──> POST /api/v1/sparqlQueries  → exécute UNE requête
            │   body: { name, module, params, returnQueryStr }
            ├── validation params (via registre)
            └── runVocablesFn(module, fn, params, userCtx)
                    └──> fonction frontend (via remoteCodeRunner)
                            └──> querySPARQL_GET_proxy  ← chokepoint
                                    ├── returnQueryStr=false → exécute → résultat
                                    └── returnQueryStr=true  → retourne la query (string)
```

## 8. Pourquoi cette approche

- **DRY** : les fonctions de construction restent à un seul endroit, jamais réécrites.
- **Surface d'API minimale** : 2 routes au lieu de 128 ; le détail des requêtes vit dans le registre, pas dans le routage.
- **Injection unique** : `returnQueryStr` branché au seul chokepoint `querySPARQL_GET_proxy` → couvre toutes les requêtes.
- **Sécurité préservée** : filtrage des accès SPARQL déjà câblé dans remoteCodeRunner, reste actif.

## 9. Prochaines étapes

1. ✅ **Fait** — enrichir la JSDoc de `sparql_proxy.js` (base de l'extraction).
2. Écrire l'extracteur AST + JSDoc → premier registre JSON réel à partir de `sparql_OWL.js`.
3. Brancher `returnQueryStr` dans `querySPARQL_GET_proxy` (court-circuit avant `$.ajax`) + cadrer la propagation de `options` sur 2-3 fonctions.
4. Rendre `runVocablesFn` sûr en concurrence (suppression des globales, garde « plugins uniquement » levée).
5. Implémenter les routes `GET` (liste) et `POST` (exec) + doc Swagger, valider la chaîne de bout en bout sur 2-3 requêtes (exécution + `returnQueryStr=true`).
