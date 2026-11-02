# Stratégie LLM : adapters & OpenRouter

## Architecture actuelle

L'intégration LLM suit un pattern adapter : [`llmClient.js`](../llmClient.js) orchestre le rate-limiting et le retry, puis délègue l'appel à un adapter résolu via la map `ADAPTERS`. L'architecture est donc déjà multi-provider par conception.

## Décision

OpenRouter n'est pas adopté comme remplacement, mais comme un adapter supplémentaire parmi les autres. Cela évite toute décision irréversible et garde la flexibilité maximale.

## Plan en trois étapes

1. **Explorer.** Brancher un adapter OpenRouter permet de tester plusieurs modèles par tâche en changeant une simple string. La taxe d'environ 5 % ne s'applique alors qu'au faible volume de test.
2. **Figer.** Une fois le modèle le plus pertinent identifié pour une tâche, on écrit l'adapter natif de son provider. L'appel devient direct : aucune taxe OpenRouter, latence minimale et `countTokens` exact.
3. **Choisir par tâche.** Le fichier `mainConfig.json` associe chaque tâche à un provider et un modèle. OpenRouter reste branché en permanence et sert de laboratoire pour toute nouvelle tâche.

## Seuil de migration

On migre une tâche d'OpenRouter vers un adapter direct lorsque le coût de la taxe dépasse l'effort d'écriture de l'adapter, soit : `coût_mensuel × 5 % > effort de l'adapter direct`.

## Point de vigilance

Chaque adapter doit fournir `countTokens`, utilisé par `waitForBudget` pour le rate-limiting. Anthropic le fournit nativement. Les autres providers l'exposent via un endpoint natif quand il existe, sinon par estimation (`tiktoken` ou ratio caractères/4). OpenRouter ne propose qu'une estimation.

## Tool calling : la traduction vit dans l'adapter

La route [`/ai/complete`](../../../api/v1/paths/ai/complete.js) parle un seul dialecte, les blocs de contenu Anthropic, quel que soit le provider. Un provider OpenAI-compatible diverge sur trois points, tous absorbés par `openRouterAdapter.js` et non par l'appelant :

|                  | Anthropic                                       | OpenAI / OpenRouter                                                 |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| Schéma d'outil   | `{ name, description, input_schema }`           | `{ type: "function", function: { name, description, parameters } }` |
| Appel d'outil    | bloc `tool_use` dans `content`                  | tableau `tool_calls`, arguments sérialisés en string JSON           |
| Résultat d'outil | bloc `tool_result` dans un message `user`       | message `role: "tool"` distinct, porteur d'un `tool_call_id`        |
| Fin de tour      | `stop_reason: end_turn / max_tokens / tool_use` | `finish_reason: stop / length / tool_calls`                         |

Conséquence directe : l'adapter reconstruisant une réponse déjà en blocs Anthropic, `normalizeCompletion` réutilise le normalizer Anthropic tel quel pour `openrouter`. Aucun second aplatisseur à maintenir en phase.

C'est aussi le critère d'admission de la route : un provider y est accepté dès que son adapter traduit dans les deux sens, requête comprise. `ollama` n'y est pas, son adapter ignore encore les outils.

Vérification hors ligne, sans clé ni backend : `node scripts/tests/test-openrouter-tools.js`.

## Un échec doit rester visible

La règle qui gouverne cette couche : aucun quota, aucun refus de provider et aucune réponse illisible ne doit ressortir sous forme de tour d'assistant vide. Une boucle d'agent qui reçoit un texte vide continue, redemande, et le vrai motif n'apparaît nulle part.

Quatre chemins l'enfreignaient et sont désormais gardés :

| Chemin                                                                                                                                  | Symptôme d'origine                                                                                                                       | Comportement                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| OpenRouter signale l'erreur _dans_ un corps HTTP 200 (`{error: {code, message}}`, erreur portée par le choix, `finish_reason: "error"`) | `choices?.[0]` vaut `undefined`, l'adapter renvoyait un bloc texte vide avec `usage` à zéro                                              | erreur avec le `status` du provider ; un `code 429` repasse donc par le retry puis ressort en 429 |
| Un tour plus gros que tout le budget `rateLimitTPM`                                                                                     | `waitForBudget` vidait la fenêtre puis lisait `tokenWindow[0].time` sur un tableau vide : `TypeError` sans rapport avec le rate-limiting | 413, message nommant le budget et la clé de config                                                |
| Attente de budget sans fin                                                                                                              | requête HTTP maintenue ouverte, aucun log                                                                                                | plafond de 2 min puis 429, et un `console.warn` à chaque attente                                  |
| Callback appelant qui lève (réponse Express déjà envoyée)                                                                               | le `.catch` final rappelait le callback avec sa propre exception, donc double réponse HTTP                                               | `then` à deux arguments, exception loguée, callback appelé une seule fois                         |

Deux corrections adjacentes tiennent au même principe : le budget est réservé _avant_ l'appel et non enregistré après, sans quoi deux tours partis en même temps lisent le même budget libre et passent tous les deux ; et un `rateLimitTPM` absent ou non numérique n'annule plus tout cadençage en silence, il le dit une fois par process au démarrage de la première requête.

Vérification hors ligne : `node scripts/tests/test-llm-failure-modes.js`.

## En résumé

OpenRouter est une porte d'entrée jetable pour explorer les modèles. L'adapter direct est la sortie optimisée une fois le choix figé. La map `ADAPTERS` gère les deux sans conflit.
