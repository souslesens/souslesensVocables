# Exposer les requêtes SPARQL en API Swagger — l'idée

## Problème

Les ~128 fonctions de requêtes (`getNodeChildren`, `getNodeInfos`, `getObjectProperties`...) vivent dans le **frontend** (`public/vocables/modules/sparqlProxies/`). Chacune construit une string SPARQL et l'envoie au backend via **un seul** endpoint générique (`/api/v1/sparqlProxy`) qui relaie du SPARQL brut.

→ Aucune de ces requêtes n'est exposée ni documentée individuellement. Un consommateur d'API ne voit que « envoie-moi du SPARQL ».

## Objectif

Exposer chaque requête comme une **route REST nommée et documentée** dans Swagger UI — sans dupliquer la logique ni écrire 128 fichiers à la main.

## Les 3 briques

### 1. Registre déclaratif (source de vérité)

Un descripteur par requête :

```js
{
  name: "getNodeChildren",
  module: "Sparql_OWL",
  description: "...",
  params: [ { name: "source", type: "string", required: true }, ... ],
  responseSchema: "#/definitions/SparqlQueryResponse",
  expose: true
}
```

Le registre alimente **les deux** sorties à partir d'une seule définition :
- génération des `apiDoc.paths` → Swagger montre N routes détaillées ;
- validation des params + routage de l'exécution.

> Registre ≠ une route générique unique. C'est la **donnée** à partir de laquelle on génère N routes nommées distinctes. `express-openapi` accepte un `apiDoc` pré-rempli.

### 2. Génération auto du registre (AST + JSDoc)

On extrait le squelette du registre par parsing statique des fichiers frontend :

| Donnée | Source | Couverture |
|---|---|---|
| Nom de fonction, params, arité, position du `callback` | AST | **100%** |
| Description (fonction + params) | JSDoc | **~1/3** (JSDoc partielle) |
| Types, schéma de sortie, exemples | — | absent → défauts |

Outils : `acorn`/`espree` (AST, cible `self.NAME = function`) + `comment-parser` (JSDoc lâches).

**Hybride** : l'auto-génération garantit la **complétude** (jamais désync sur noms/params) et **signale les fonctions sans JSDoc**. Une couche d'**override manuel léger** ajoute ce que la JSDoc ne porte pas (types, schéma de réponse, exemples, flag `expose`).

```
AST + JSDoc ──> squelette auto (complet, jamais désync)
   override  ──> types, responseSchema, examples, expose
        ▼
   registre final ──> apiDoc.paths  +  validation
```

### 3. Exécution via remoteCodeRunner (réutilise le code frontend)

`bin/remoteCodeRunner.js` fait déjà tourner du code frontend dans Node : mocke `window`/`$`, route `$.ajax` vers `/sparqlProxy`, charge `Config`+sources, applique `UserRequestFiltering` (contrôle d'accès préservé).

→ La route appelle directement `Sparql_OWL.getNodeChildren(...)` **tel quel**. Zéro réécriture des query-builders.

**3 blockers à régler avant usage en API :**
1. **Concurrence** — globals module-level (`activeCallback`, `currentUserContext`) non sûrs en concurrent → refactorer en contexte par appel. *(non négociable)*
2. **Garde plugins-only** — `runUserDataFunction` refuse les chemins hors `plugins/` → ajouter une méthode `runVocablesFn` autorisée sur `public/vocables/modules/`.
3. **Mocks fragiles** — `$`/`document`/`vis` sont des stubs → n'exposer que les fonctions « pures requête » (`expose: true`).

## Schéma global

```
registre (auto AST+JSDoc + override)
   ├──> apiDoc.paths        → Swagger: N routes nommées et documentées
   ├──> validation params
   └──> route /query/:name  → runVocablesFn(module, fn, params, userCtx)
                                   └──> exec réelle des fns frontend (remoteCodeRunner)
```

## Pourquoi cette approche

- **DRY** : les query-builders restent à un seul endroit, jamais réécrits.
- **Complétude garantie** : le registre auto suit le code, pas de dérive.
- **Doc native** : N routes détaillées dans Swagger UI existant, pas un proxy opaque.
- **Sécurité préservée** : filtrage d'accès SPARQL déjà câblé dans remoteCodeRunner.

## Prochaines étapes

1. Extracteur AST+JSDoc → registre JSON réel sur `sparql_OWL.js`.
2. Trier les fonctions « pures » exposables (`expose: true`).
3. `runVocablesFn` concurrent-safe (sans globals, sans garde plugins).
4. Génération `apiDoc.paths` + route `/query/:name` → bout-en-bout sur 2-3 requêtes.
