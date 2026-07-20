# AI

AI routes use the LLM provider configured in `mainConfig.llm`. The full OpenAPI contract is available
in Swagger at `/api/v1/#/AI`.

These routes require administrator access and bearer-token authentication.

## Routes

-   `GET /api/v1/classify`: runs the test prompt from `bin/AI/prompts/classify_tests.md` through
    the configured LLM and returns the model, raw output and token usage.
-   `POST /api/v1/alignment`: classifies non-exact label matches with
    `bin/AI/prompts/semantic_alignment_prompt.md` and returns classifications, category counts and
    token usage.

The active model and provider are not selected per request. They come from `mainConfig.llm`.
