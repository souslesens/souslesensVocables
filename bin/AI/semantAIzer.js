import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import Fuse from "fuse.js";

// ─── Config ───────────────────────────────────────────────────
const CHUNK_SIZE = 15; // reduced to stay under rate limit
const CONCURRENCY = 1; // sequential — safer at low tier
const MAX_INPUT_TOKENS = 180000;
const MAX_OUTPUT_TOKENS = 4096;
const RATE_LIMIT_TPM = 28000; // stay 2k below the 30k limit

var SYSTEM_PROMPT = `Tu es un expert en matching de labels.
Les listes te sont transmises en base64 (JSON encodé UTF-8).
Décode-les, puis retourne UNIQUEMENT un JSON valide sans markdown :
{"matches":[{"a":"...","b":"...","score":0.95,"reason":"..."}]}
le match ne concerne que la proximité des mots et non pas leur signification.
If multiple matches for a listA member keep only the listB  item with the best score
Si la distance de levenstein moyenne est inférieure à 0.6 ne remplit pas les colonnes id_b et label_b
`;

var SYSTEM_PROMPT = `
Des listes  d'objects json te sont transmises puis retourne UNIQUEMENT un CSV avec les colonnes :
"id_a,label_a,id_b,label_b,score"
assemble les  listA et listB en te basant sur le champ label de chacune desdeux listes
supprime les pluriels (tokenize)
la distance de levenstein doit etre calculée pour chaque token et la moyenne par label doit être >0.6 


`;

// ─── Client ───────────────────────────────────────────────────
const anthropic = new Anthropic({
    apiKey: "XXX",
    dangerouslyAllowBrowser: true,
});

// ─── Token budget (sliding window 60s) ───────────────────────
const tokenWindow = [];

function recordTokens(count) {
    const now = Date.now();
    tokenWindow.push({ count, time: now });
    // drop entries older than 60s
    while (tokenWindow.length && tokenWindow[0].time < now - 60000) {
        tokenWindow.shift();
    }
}

function tokensUsedLastMinute() {
    const now = Date.now();
    return tokenWindow.filter((e) => e.time >= now - 60000).reduce((sum, e) => sum + e.count, 0);
}

async function waitForBudget(needed) {
    while (true) {
        const used = tokensUsedLastMinute();
        const available = RATE_LIMIT_TPM - used;
        if (available >= needed) {
            break;
        }

        const waitMs = 60000 - (Date.now() - tokenWindow[0].time) + 500;
        console.log(`Rate limit: used ${used}/${RATE_LIMIT_TPM} tokens. Waiting ${Math.ceil(waitMs / 1000)}s…`);
        await sleep(waitMs);
    }
}

// ─── Retry with exponential backoff ───────────────────────────
async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(fn, retries = 5, delayMs = 5000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            const is429 = err.status === 429 || err.message?.includes("rate_limit");
            if (!is429 || attempt === retries) {
                throw err;
            }

            // Parse retry-after header if available, else exponential backoff
            const retryAfter = err.headers?.["retry-after"];
            const wait = retryAfter ? parseInt(retryAfter) * 1000 : delayMs * Math.pow(2, attempt - 1);

            console.warn(`429 rate limit (attempt ${attempt}/${retries}) — waiting ${Math.ceil(wait / 1000)}s…`);
            await sleep(wait);
        }
    }
}

// ─── Helpers ──────────────────────────────────────────────────
function encode(arr) {
    return arr;
    return Buffer.from(JSON.stringify(arr), "utf-8").toString("base64");
}

function chunkArray(arr, size) {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
}

function getCandidates(chunkA, listB, topN = 20) {
    const fuse = new Fuse(listB, { includeScore: true, threshold: 0.6 });
    return [
        ...new Set(
            chunkA.flatMap((a) =>
                fuse
                    .search(a)
                    .slice(0, topN)
                    .map((r) => r.item),
            ),
        ),
    ];
}

function buildContent(chunkA, reducedB) {
    return JSON.stringify({ listA: encode(chunkA), listB: encode(reducedB) });
}

async function countTokens(chunkA, reducedB) {
    const response = await anthropic.messages.countTokens({
        model: "claude-sonnet-4-20250514",
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildContent(chunkA, reducedB) }],
    });
    return response.input_tokens;
}

function parseJSON(text, chunkA) {
    const clean = text.replace(/```json|```/g, "").trim();
    try {
        const parsed = JSON.parse(clean);
        return parsed.matches || [];
    } catch {
        const partial = [...clean.matchAll(/\{[^{}]*"a"\s*:[^{}]*"b"\s*:[^{}]*"score"\s*:[^{}]*\}/g)];
        if (partial.length > 0) {
            console.warn(`  → Partial JSON: ${partial.length} matches salvaged`);
            return partial.map((m) => JSON.parse(m[0]));
        }
        throw new Error(`JSON parse failed [${chunkA[0]}…]: ${clean.slice(0, 120)}`);
    }
}

// ─── Streaming call ───────────────────────────────────────────
async function matchChunk(chunkA, reducedB, inputTokens) {
    return withRetry(async () => {
        // Wait until we have enough token budget
        await waitForBudget(inputTokens);

        let fullText = "";

        const stream = anthropic.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: MAX_OUTPUT_TOKENS,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: buildContent(chunkA, reducedB) }],
        });

        stream.on("text", (text) => {
            fullText += text;
        });

        const final = await stream.finalMessage();
        const totalTokens = final.usage.input_tokens + final.usage.output_tokens;

        // Record actual tokens used
        recordTokens(totalTokens);
        console.log(`  → stop: ${final.stop_reason} | in: ${final.usage.input_tokens} | out: ${final.usage.output_tokens} | window: ${tokensUsedLastMinute()}/${RATE_LIMIT_TPM}`);

        if (final.stop_reason === "max_tokens") {
            throw Object.assign(new Error("RESPONSE_TRUNCATED"), { chunkA });
        }
        return fullText;
        return parseJSON(fullText, chunkA);
    });
}

// ─── Public API ───────────────────────────────────────────────
export async function getSimilarLabels(listA, listB, callback) {
    let chunkSize = CHUNK_SIZE;

    listB = listA;

    async function run() {
        const allMatches = [];
        const chunks = chunkArray(listA, chunkSize);
        console.log(`Processing ${listA.length} labels in ${chunks.length} chunks of ${chunkSize}`);

        for (let i = 0; i < chunks.length; i += CONCURRENCY) {
            const wave = chunks.slice(i, i + CONCURRENCY);

            try {
                const results = await Promise.all(
                    wave.map(async (chunkA) => {
                        const reducedB = getCandidates(chunkA, listB);
                        const inputTokens = await countTokens(chunkA, reducedB);
                        console.log(`Chunk [${chunkA[0]} … ${chunkA.at(-1)}]: ${inputTokens} tokens`);

                        if (inputTokens > MAX_INPUT_TOKENS) {
                            throw Object.assign(new Error("CHUNK_TOO_LARGE"), {
                                suggestedSize: Math.max(5, Math.floor(chunkSize * 0.7)),
                            });
                        }

                        return matchChunk(chunkA, reducedB, inputTokens);
                    }),
                );

                chunkSize = Math.min(chunkSize + 2, CHUNK_SIZE);
                console.log(`Progress: ${Math.min(i + CONCURRENCY, chunks.length)}/${chunks.length} chunks | ${allMatches.length} matches so far`);
            } catch (err) {
                if (err.message === "CHUNK_TOO_LARGE") {
                    chunkSize = err.suggestedSize;
                    console.warn(`Retrying with chunk size ${chunkSize}…`);
                    return run();
                }
                if (err.message === "RESPONSE_TRUNCATED") {
                    chunkSize = Math.max(5, Math.floor(chunkSize * 0.7));
                    console.warn(`Response truncated — retrying with chunk size ${chunkSize}…`);
                    return run();
                }
                throw err;
            }
        }

        return allMatches;
    }

    try {
        const matches = await run();
        console.log(`Done: ${matches.length} matches`);
        return callback(null, { matches });
    } catch (err) {
        console.error("getSimilarLabels error:", err.message);
        return callback(err, null);
    }
}

export default { getSimilarLabels };
