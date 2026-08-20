const OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";

// OpenRouter ne fournit pas d'endpoint de comptage de tokens.
// Estimation pré-appel pour le budget du rate-limiter : ratio moyen observé sur
// les tokenizers BPE (~3.5 caractères par token). Volontairement conservateur
// (on divise par un petit nombre) pour ne pas sous-estimer le budget consommé.
const AVERAGE_CHARS_PER_TOKEN = 3.5;

// finish_reason OpenAI -> stop_reason Anthropic, pour que la boucle d'agent lise le même
// vocabulaire quel que soit le provider configuré.
const ANTHROPIC_STOP_REASONS = { stop: "end_turn", length: "max_tokens", tool_calls: "tool_use" };

function estimateTokens({ system, messages, tools }) {
    let totalCharacters = system ? system.length : 0;
    (messages ?? []).forEach((message) => {
        if (typeof message.content === "string") {
            totalCharacters += message.content.length;
            return;
        }
        // JSON.stringify rend `undefined` sur un contenu absent, et lire `.length` dessus faisait
        // échouer l'estimation avant même l'appel, avec une TypeError qui ne parle pas de tokens.
        const serializedContent = JSON.stringify(message.content);
        totalCharacters += serializedContent ? serializedContent.length : 0;
    });
    // Les schémas d'outils dominent l'entrée d'un tour d'agent : le catalogue MCP seul pèse environ
    // 5 800 tokens, renvoyés à chaque itération. Les omettre rendrait le rate-limiter aveugle à
    // l'essentiel du trafic qu'il est censé cadencer.
    if (tools && tools.length > 0) {
        totalCharacters += JSON.stringify(tools).length;
    }
    return Math.ceil(totalCharacters / AVERAGE_CHARS_PER_TOKEN);
}

// Convertit les schémas d'outils du format Anthropic ({ name, description, input_schema }) vers le
// format function calling OpenAI attendu par OpenRouter.
function toOpenAiTools(anthropicTools) {
    return anthropicTools.map((anthropicTool) => ({
        type: "function",
        function: { name: anthropicTool.name, description: anthropicTool.description, parameters: anthropicTool.input_schema },
    }));
}

// Aplatit le `content` d'un bloc tool_result Anthropic (string, ou tableau de blocs) vers la string
// unique qu'attend un message OpenAI `role: "tool"`.
function toToolResultText(toolResultContent) {
    if (typeof toolResultContent === "string") {
        return toolResultContent;
    }
    const resultBlocks = toolResultContent ?? [];
    const resultTextParts = [];
    for (const resultBlock of resultBlocks) {
        resultTextParts.push(resultBlock.type === "text" ? resultBlock.text : JSON.stringify(resultBlock));
    }
    return resultTextParts.join("\n");
}

// Convertit le couple { system, messages } (format Anthropic) vers le tableau messages
// OpenAI/OpenRouter. Trois divergences de format sont absorbées ici :
//   - le system prompt devient un message à part entière ;
//   - les blocs tool_use d'un tour assistant deviennent un tableau `tool_calls` à côté du texte ;
//   - les blocs tool_result, portés côté Anthropic par un message `user`, deviennent autant de
//     messages `role: "tool"` distincts.
// C'est cette traduction de la *requête*, et pas seulement de la réponse, qui permet à la route
// /ai/complete de garder un contrat unique en blocs Anthropic quel que soit le provider.
function toOpenAiMessages(system, messages) {
    const openAiMessages = [];
    if (system) openAiMessages.push({ role: "system", content: system });

    (messages ?? []).forEach((message) => {
        if (typeof message.content === "string") {
            openAiMessages.push(message);
            return;
        }

        const contentBlocks = message.content ?? [];
        const textParts = [];
        const toolCalls = [];
        const toolResultMessages = [];

        for (const contentBlock of contentBlocks) {
            if (contentBlock.type === "text") {
                textParts.push(contentBlock.text);
            }
            if (contentBlock.type === "tool_use") {
                toolCalls.push({
                    id: contentBlock.id,
                    type: "function",
                    function: { name: contentBlock.name, arguments: JSON.stringify(contentBlock.input ?? {}) },
                });
            }
            if (contentBlock.type === "tool_result") {
                toolResultMessages.push({ role: "tool", tool_call_id: contentBlock.tool_use_id, content: toToolResultText(contentBlock.content) });
            }
        }

        // Les résultats d'outils passent avant le texte du même message : ils répondent au tour
        // assistant précédent, alors que le texte qui les accompagne appartient au tour courant.
        toolResultMessages.forEach((toolResultMessage) => openAiMessages.push(toolResultMessage));

        const text = textParts.join("");
        if (toolCalls.length > 0) {
            // `content: null` et non `""` : c'est ce que l'API OpenAI spécifie pour un tour
            // assistant qui n'appelle que des outils, et certains modèles rejettent la chaîne vide.
            openAiMessages.push({ role: message.role, content: text || null, tool_calls: toolCalls });
        } else if (text) {
            openAiMessages.push({ role: message.role, content: text });
        }
    });

    return openAiMessages;
}

// Statut HTTP par défaut d'une erreur signalée dans un corps 200 sans code exploitable : 502, la
// même valeur que la route /ai/complete attribue à un provider qui refuse.
const openRouterBodyErrorStatus = 502;

/**
 * Détecte une erreur signalée *dans* une réponse HTTP 200.
 *
 * OpenRouter renvoie les pannes côté provider aussi souvent dans le corps qu'avec un statut HTTP :
 * `{error: {code, message}}` au premier niveau, une erreur portée par le choix, ou un
 * `finish_reason: "error"`. Lue comme une réponse normale, aucune de ces formes ne produit
 * d'exception : `choices?.[0]` vaut `undefined`, le message reconstruit est vide, et le tour
 * d'assistant renvoyé est un bloc texte vide avec `usage` à zéro. C'est par là qu'un dépassement de
 * quota arrivait jusqu'à la boucle d'agent sous forme de silence plutôt que d'erreur.
 *
 * @param {*} openRouterResponse
 * @returns {Error|null}
 */
function errorFromOpenRouterBody(openRouterResponse) {
    const firstChoice = openRouterResponse?.choices?.[0];
    const reportedError = openRouterResponse?.error ?? firstChoice?.error;

    if (reportedError) {
        const reportedMessage = reportedError.message ?? JSON.stringify(reportedError);
        const error = new Error(`OpenRouter returned an error inside a successful response: ${reportedMessage}`);
        const reportedCode = Number(reportedError.code);
        error.status = Number.isInteger(reportedCode) && reportedCode >= 400 ? reportedCode : openRouterBodyErrorStatus;
        return error;
    }

    if (!Array.isArray(openRouterResponse?.choices) || openRouterResponse.choices.length === 0) {
        const error = new Error(`OpenRouter returned no completion choice: ${JSON.stringify(openRouterResponse).slice(0, 500)}`);
        error.status = openRouterBodyErrorStatus;
        return error;
    }

    if (firstChoice.finish_reason === "error") {
        const error = new Error(`OpenRouter ended the turn on an error (native_finish_reason: ${firstChoice.native_finish_reason ?? "none"}).`);
        error.status = openRouterBodyErrorStatus;
        return error;
    }

    return null;
}

// Normalise la réponse OpenRouter (format OpenAI) vers le format de réponse Anthropic, blocs
// tool_use compris, pour que cet adapter reste un drop-in du anthropicAdapter et que
// normalizeCompletion puisse réutiliser le normalizer Anthropic sans le dupliquer.
function toAnthropicResponse(openRouterResponse) {
    const firstChoice = openRouterResponse.choices?.[0];
    const responseMessage = firstChoice?.message ?? {};
    const usage = openRouterResponse.usage ?? {};
    const toolCalls = responseMessage.tool_calls ?? [];

    const contentBlocks = [];
    // Le bloc texte reste présent même vide quand le modèle n'appelle aucun outil : classify.js et
    // alignment.js lisent `content[0].text` sans garde.
    if (responseMessage.content || toolCalls.length === 0) {
        contentBlocks.push({ type: "text", text: responseMessage.content ?? "" });
    }
    toolCalls.forEach((toolCall) => {
        const rawArguments = toolCall.function?.arguments ?? "{}";
        let parsedArguments;
        try {
            parsedArguments = JSON.parse(rawArguments);
        } catch {
            // Échec bruyant plutôt qu'un repli sur {} : une boucle d'agent qui exécuterait l'outil
            // avec des arguments vides produirait un résultat faux que rien en aval ne
            // distinguerait d'un vrai.
            throw new Error(`OpenRouter returned malformed tool arguments for "${toolCall.function?.name}": ${rawArguments}`);
        }
        contentBlocks.push({ type: "tool_use", id: toolCall.id, name: toolCall.function?.name, input: parsedArguments });
    });

    return {
        id: openRouterResponse.id,
        model: openRouterResponse.model,
        role: "assistant",
        content: contentBlocks,
        stop_reason: ANTHROPIC_STOP_REASONS[firstChoice?.finish_reason] ?? firstChoice?.finish_reason ?? null,
        usage: {
            input_tokens: usage.prompt_tokens ?? 0,
            output_tokens: usage.completion_tokens ?? 0,
        },
    };
}

function createOpenRouterAdapter(openRouterConfig) {
    const headers = {
        Authorization: `Bearer ${openRouterConfig.apiKey}`,
        "Content-Type": "application/json",
    };
    // Headers de classement optionnels recommandés par OpenRouter.
    if (openRouterConfig.appUrl) headers["HTTP-Referer"] = openRouterConfig.appUrl;
    if (openRouterConfig.appName) headers["X-Title"] = openRouterConfig.appName;

    async function createMessage({ model, system, messages, maxTokens, tools }, callback) {
        try {
            const requestBody = {
                model: model ?? openRouterConfig.defaultModel,
                max_tokens: maxTokens ?? openRouterConfig.maxTokens,
                messages: toOpenAiMessages(system, messages),
            };
            // Renseigné seulement quand l'appelant déclare des outils : un tableau vide bascule
            // certains modèles en erreur, et classify/alignment n'en passent jamais.
            if (tools && tools.length > 0) {
                requestBody.tools = toOpenAiTools(tools);
            }

            const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
                method: "POST",
                headers,
                body: JSON.stringify(requestBody),
            });

            // Corps lu en texte dans tous les cas : une passerelle ou un proxy peut répondre du HTML
            // avec un statut 200, et `response.json()` échouait alors sur "Unexpected token <", sans
            // rien montrer de ce qui avait réellement été reçu.
            const rawBody = await response.text();

            if (!response.ok) {
                const error = new Error(`OpenRouter request failed (${response.status}): ${rawBody}`);
                error.status = response.status;
                error.headers = Object.fromEntries(response.headers.entries());
                return callback(error);
            }

            let openRouterResponse;
            try {
                openRouterResponse = JSON.parse(rawBody);
            } catch {
                const error = new Error(`OpenRouter answered ${response.status} with a body that is not JSON: ${rawBody.slice(0, 500)}`);
                error.status = openRouterBodyErrorStatus;
                return callback(error);
            }

            const bodyError = errorFromOpenRouterBody(openRouterResponse);
            if (bodyError) {
                bodyError.headers = Object.fromEntries(response.headers.entries());
                return callback(bodyError);
            }

            callback(null, toAnthropicResponse(openRouterResponse));
        } catch (error) {
            callback(error);
        }
    }

    function complete(prompt, options, callback) {
        return createMessage(
            {
                model: options?.model,
                system: options?.system,
                messages: [{ role: "user", content: prompt }],
                maxTokens: options?.maxTokens,
            },
            callback,
        );
    }

    async function countTokens({ system, messages, tools }) {
        return estimateTokens({ system, messages, tools });
    }

    return { complete, createMessage, countTokens };
}

export default createOpenRouterAdapter;
