# Exposer les requêtes SPARQL en API Swagger

> Document de conception, à valider. L'objectif est de transformer les fonctions de requêtes SPARQL du frontend en véritables routes d'API REST, nommées et documentées, sans réécrire la logique existante.


Aujourd'hui, environ 128 fonctions de requêtes (`getNodeChildren`, `getNodeInfos`, `getObjectProperties`, etc.) sont définies dans le **frontend**, dans le répertoire `public/vocables/modules/sparqlProxies/`.

Chacune de ces fonctions construit une chaîne de caractères SPARQL, puis l'envoie au backend en passant par **un unique endpoint générique** : `/api/v1/sparqlProxy`. Et récupère les résultats en les traitants.

## 2. L'objectif

Exposer chaque requête comme une **route REST nommée et documentée** dans Swagger UI.

Deux contraintes fortes encadrent cet objectif :

1. Ne **pas dupliquer** la logique de construction des requêtes (les fonctions du frontend restent la seule source).
2. Ne **pas écrire 128 fichiers de route à la main** (la documentation et le routage doivent être générés).

## 3. L'approche : trois briques

La solution repose sur trois composants qui s'articulent ensemble.

### Brique 1 — Un registre déclaratif (la source de vérité)

On définit un **descripteur par requête**. C'est un simple objet de configuration qui décrit la fonction :

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

À partir de cette **unique définition**, le registre alimente **deux sorties distinctes** :

- la **génération de la documentation** (`apiDoc.paths`), pour que Swagger affiche N routes détaillées et lisibles ;
- la **validation des paramètres** entrants et le **routage** vers la bonne fonction lors de l'exécution.

> **Point important à ne pas confondre :** le registre n'est *pas* une route générique unique déguisée. C'est la **donnée** à partir de laquelle on génère N routes nommées bien distinctes. La librairie `express-openapi` sait justement accepter un objet `apiDoc` pré-rempli, ce qui rend cette génération possible.

### Brique 2 — La génération automatique du registre (AST + JSDoc)

Remplir 128 descripteurs à la main serait fastidieux et vite désynchronisé du code. On génère donc le **squelette du registre** automatiquement, par **analyse statique** des fichiers du frontend (sans exécuter le code).

Voici ce qu'on peut extraire, et avec quelle fiabilité :

| Donnée extraite | Source | Couverture |
|---|---|---|
| Nom de la fonction, paramètres, arité, position du `callback` | Analyse de l'AST | **100 %** |
| Description, types précis, schéma de la réponse, exemples, drapeau `expose` | Commentaires JSDoc enrichis | dépend de la JSDoc écrite sur chaque fonction |

Outils envisagés : `acorn` ou `espree` pour l'analyse de l'AST (en ciblant le motif `self.NOM = function`), et `comment-parser` pour lire les blocs JSDoc, même incomplets.

**Tout passe par la JSDoc.** Pas de fichier d'override séparé : toute l'information complémentaire (types, schéma de réponse, exemples, `expose`) vit dans le bloc JSDoc, à côté de la fonction. La JSDoc supporte déjà nativement les types (`@param {string}`), et des **tags personnalisés** portent le reste, lus par `comment-parser` :

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

Ainsi :

- l'**AST garantit la complétude** : le registre ne peut jamais être désynchronisé du code sur les noms et les paramètres, et il **signale les fonctions dépourvues de JSDoc** ;
- la **JSDoc est la seule source du complément** : enrichir une fonction = éditer son bloc JSDoc, au même endroit que le code. Source unique, pas de second fichier à maintenir.

```
AST       ──> noms, params, arité (complet, jamais désynchronisé)
JSDoc     ──> description, types, responseSchema, examples, expose
        ▼
   registre final ──> apiDoc.paths  +  validation
```

### Brique 3 — L'exécution via remoteCodeRunner (réutilise le code frontend)

Le fichier `bin/remoteCodeRunner.js` sait **déjà** faire tourner du code frontend à l'intérieur de Node. Pour cela, il :

- mocke `window` et `$` (jQuery) ;
- redirige les appels `$.ajax` vers `/sparqlProxy` ;
- charge la configuration `Config` et les sources ;
- applique `UserRequestFiltering`, ce qui **préserve le contrôle d'accès**.

Concrètement, la route d'API pourra donc appeler directement `Sparql_OWL.getNodeChildren(...)` **tel quel**, sans aucune réécriture des fonctions de construction de requêtes.

Trois points bloquants doivent toutefois être réglés avant de pouvoir s'en servir dans une API :

1. **La concurrence.** Le code utilise actuellement des variables globales au niveau du module (`activeCallback`, `currentUserContext`). Elles ne sont pas sûres en contexte concurrent (plusieurs appels simultanés se marcheraient dessus). Il faut les refactorer en un **contexte propre à chaque appel**. *(Point non négociable.)*
2. **La garde « plugins uniquement ».** La fonction `runUserDataFunction` refuse aujourd'hui tout chemin situé hors du répertoire `plugins/`. Il faut ajouter une méthode `runVocablesFn` qui autorise l'exécution de code situé dans `public/vocables/modules/`.


## 4. Schéma d'ensemble

```
registre (auto AST+JSDoc + override)
   ├──> apiDoc.paths        → Swagger : N routes nommées et documentées
   ├──> validation des paramètres
   └──> route /query/:name  → runVocablesFn(module, fn, params, userCtx)
                                   └──> exécution réelle des fonctions frontend
                                        (via remoteCodeRunner)
```

## 5. Pourquoi cette approche

- **DRY** : les fonctions de construction de requêtes restent à un seul endroit et ne sont jamais réécrites.
- **Complétude garantie** : le registre généré suit automatiquement le code ; pas de dérive possible.
- **Documentation native** : on obtient N routes détaillées dans le Swagger UI déjà en place, au lieu d'un proxy opaque.
- **Sécurité préservée** : le filtrage des accès SPARQL est déjà câblé dans remoteCodeRunner et reste actif.

## 6. Prochaines étapes

1. Écrire l'extracteur AST + JSDoc pour produire un premier registre JSON réel à partir de `sparql_OWL.js`.
2. Identifier et trier les fonctions « pures », celles qui sont réellement exposables (`expose: true`).
3. Rendre `runVocablesFn` sûr en concurrence (suppression des globales, levée de la garde « plugins uniquement »).
4. Générer les `apiDoc.paths` et la route `/query/:name`, puis valider la chaîne complète de bout en bout sur 2 ou 3 requêtes.
