<!-- AUTO-GENERATED: do not edit by hand -->
# AI

<!-- AUTO-DESC:START -->

## Overview

The `bin/AI` module contains the server-side LLM integration used by AI API routes.

`llmClient.js` reads `mainConfig.llm`, selects the configured provider adapter, applies token budget
checks with `rateLimitTPM`, decrypts encrypted API keys when needed, and exposes `complete` and
`createMessage` calls to route handlers.

## Modules

### Client and secrets

-   `llmClient.js`: provider selection, retry, token counting and rate-limit budget.
-   `secret.js`: encryption and decryption helpers for values stored as `enc:v1:...`.
-   `encryptKey.js`: CLI helper for encrypting `llm.<provider>.apiKey`.

### Adapters

-   `adapters/anthropicAdapter.js`: Anthropic Messages API adapter.
-   `adapters/openRouterAdapter.js`: OpenRouter chat-completions adapter normalized to the Anthropic
    response shape.
-   `adapters/ollamaAdapter.js`: local Ollama chat adapter normalized to the Anthropic response
    shape.

### Prompts

-   `prompts/classify_tests.md`: prompt used by `GET /api/v1/classify`.
-   `prompts/semantic_alignment_prompt.md`: prompt used by `POST /api/v1/alignment`.

<!-- AUTO-DESC:END -->

```{toctree}
:maxdepth: 5
:caption: Contents

adapters/index
data/index
docs/index
prompts/index
```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `encryptKey.js`
- `llmClient.js`
- `secret.js`

<!-- AUTO-INLINE-FILES:END -->
