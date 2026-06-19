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

## En résumé

OpenRouter est une porte d'entrée jetable pour explorer les modèles. L'adapter direct est la sortie optimisée une fois le choix figé. La map `ADAPTERS` gère les deux sans conflit.
