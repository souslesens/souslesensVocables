<!-- AUTO-GENERATED: do not edit by hand -->
# AI routes

<!-- AUTO-DESC:START -->

## Overview

AI routes expose LLM-backed operations through the HTTP API. They use `bin/AI/llmClient.js`, which
selects the provider configured in `mainConfig.llm`.

The OpenAPI descriptions live directly in the route files through `GET.apiDoc` and `POST.apiDoc`.
Swagger exposes them under the `AI` tag at `/api/v1/#/AI`.

## Modules

### `classify.js`

`GET /api/v1/classify` reads `bin/AI/prompts/classify_tests.md`, sends it to the configured LLM and
returns the model, raw output and token usage.

### `alignment.js`

`POST /api/v1/alignment` reads `bin/AI/prompts/semantic_alignment_prompt.md`, classifies non-exact
label matches, and returns classifications, category counts and token usage.

<!-- AUTO-DESC:END -->
