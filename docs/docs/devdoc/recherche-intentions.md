# La recherche : des intentions, pas des modes

Rien dans le code ne disait à quoi une recherche servait. Chaque amélioration était donc faite en
regardant un seul usage, et dégradait les autres sans que personne ne le voie.

## Le cas qui l'a révélé

Chercher `projection` dans eclass remonte `Project Management`. Le champ `label` est stemmé, donc
`projection` et `project` deviennent le même token. Les deux résultats ont le même score.

| Date  | Changement                     | Sert                    | Casse                                    |
| ----- | ------------------------------ | ----------------------- | ---------------------------------------- |
| 17/06 | `porter_stem` mis en service   | alignement d'ontologies | choix d'une entité                       |
| 06/07 | Recherche par préfixe `mot*`   | choix d'une entité      | cassée d'avance par le stemmer           |
| 21/07 | `(mot* OR mot)` pour compenser | choix d'une entité      | fait remonter `project` sur `projection` |

Trois correctifs, chacun réparant le précédent, aucun ne regardant l'ensemble. Le stemmer du 17/06
était justifié : l'alignement en a besoin. Il a seulement été posé sur le champ que tout le monde
interroge.

## Les trois intentions

| Intention        | Veut                                  | Utilisée par                                      |
| ---------------- | ------------------------------------- | ------------------------------------------------- |
| `pickEntity`     | **précision**, cette entité là        | onglet classes, plus court chemin, weaver, browse |
| `findCandidates` | **rappel**, tout ce qui pourrait      | similars, bots, recherche libre du standardizer   |
| `resolveKnown`   | **exactitude**, ce label ou cette URI | alignements en masse, lineage_whiteboard          |

Précision et rappel sont opposés. Aucun réglage unique ne satisfait les deux, d'où le passage de
`mode` + options combinées à une intention nommée (`SearchUtil.searchIntents`).

## Ce qu'il reste

Les intentions sont nommées mais partagent encore **un seul champ indexé**. Un seul index suffit,
avec un sous-champ par intention :

| Intention        | Champ           | Analyse                         |
| ---------------- | --------------- | ------------------------------- |
| `pickEntity`     | `label`         | sans stemmer, avec asciifolding |
| `findCandidates` | `label.stemmed` | avec stemmer                    |
| `resolveKnown`   | `label.keyword` | déjà en place                   |

Coût : réindexation complète. Le mapping visé est déjà écrit dans `bin/elasticRestProxy.js` sous
le nom `mappingsNew`, construit mais jamais envoyé depuis le 17/06.

Avant d'y revenir : savoir ce qui a motivé la bascule du 17/06, sinon on refait le tour en sens
inverse.
