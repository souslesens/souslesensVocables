import fs from "fs";
import path from "path";
import OpenAPIResponseValidator from "openapi-response-validator";

const ResponseValidator = OpenAPIResponseValidator.default || OpenAPIResponseValidator;

const seenMismatches = new Set();
const validatorCache = new Map();

function findOperationForRequest(apiDoc, method, requestPath) {
    const lowerMethod = method.toLowerCase();
    const requestSegments = requestPath.split("/");
    const apiPaths = apiDoc.paths || {};
    for (const apiPath of Object.keys(apiPaths)) {
        const apiSegments = apiPath.split("/");
        if (apiSegments.length !== requestSegments.length) continue;
        let matches = true;
        for (let segmentIndex = 0; segmentIndex < apiSegments.length; segmentIndex++) {
            const apiSegment = apiSegments[segmentIndex];
            if (apiSegment.startsWith("{") && apiSegment.endsWith("}")) continue;
            if (apiSegment !== requestSegments[segmentIndex]) {
                matches = false;
                break;
            }
        }
        if (!matches) continue;
        const operation = apiPaths[apiPath]?.[lowerMethod];
        if (operation) return { apiPath, operation };
    }
    return null;
}

function getValidatorFor(apiPath, method, operation, definitions) {
    const cacheKey = `${method}|${apiPath}`;
    let validator = validatorCache.get(cacheKey);
    if (!validator) {
        validator = new ResponseValidator({
            responses: operation.responses || {},
            definitions: definitions || {},
        });
        validatorCache.set(cacheKey, validator);
    }
    return validator;
}

function getValueByJsonPath(rootObject, jsonPath) {
    if (!jsonPath || rootObject == null) return rootObject;
    return jsonPath
        .split(/[.[\]]+/)
        .filter(Boolean)
        .reduce((current, key) => (current == null ? current : current[key]), rootObject);
}

function truncateSample(value) {
    try {
        if (value === null || typeof value !== "object") return value;
        const serialized = JSON.stringify(value);
        if (serialized && serialized.length > 500) return serialized.slice(0, 500) + "...";
        return value;
    } catch {
        return String(value);
    }
}

function dedupKey(method, route, jsonPath, actualType) {
    return `${method}|${route}|${jsonPath}|${actualType}`;
}

function appendMismatch(logFilePath, mismatch) {
    const key = dedupKey(mismatch.method, mismatch.route, mismatch.jsonPath, mismatch.actualType);
    if (seenMismatches.has(key)) return;
    seenMismatches.add(key);
    const line = JSON.stringify(mismatch) + "\n";
    fs.appendFile(logFilePath, line, (err) => {
        if (err) console.warn("[response-validator] cannot write log:", err.message);
    });
    console.warn(`[response-validator] ${mismatch.method} ${mismatch.route} :: ${mismatch.jsonPath || "(root)"} expected=${JSON.stringify(mismatch.schemaExpected)} actualType=${mismatch.actualType}`);
}

export function attachResponseValidator(app, apiDoc, options = {}) {
    if (process.env.VALIDATE_RESPONSES !== "true") return;

    const basePath = options.basePath || "/api/v1";
    const logFilePath = options.logPath || "logs/schema-mismatches.jsonl";

    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });

    app.use(basePath, (req, res, next) => {
        const originalJson = res.json.bind(res);
        res.json = function wrappedJson(body) {
            try {
                const match = findOperationForRequest(apiDoc, req.method, req.path);
                if (match) {
                    const validator = getValidatorFor(match.apiPath, req.method, match.operation, apiDoc.definitions);
                    const validationErrors = validator.validateResponse(res.statusCode, body);
                    if (validationErrors && validationErrors.errors) {
                        for (const validationError of validationErrors.errors) {
                            const sampleValue = getValueByJsonPath(body, validationError.path);
                            const actualType = sampleValue === null ? "null" : Array.isArray(sampleValue) ? "array" : typeof sampleValue;
                            appendMismatch(logFilePath, {
                                timestamp: new Date().toISOString(),
                                method: req.method,
                                route: basePath + match.apiPath,
                                operationId: match.operation.operationId,
                                statusCode: res.statusCode,
                                jsonPath: validationError.path,
                                schemaExpected: {
                                    message: validationError.message,
                                    errorCode: validationError.errorCode,
                                },
                                actualType,
                                actualSample: truncateSample(sampleValue),
                            });
                        }
                    }
                }
            } catch (validationException) {
                console.warn("[response-validator] internal error:", validationException.message);
            }
            return originalJson(body);
        };
        next();
    });

    console.log(`[response-validator] enabled — mismatches logged to ${logFilePath}`);
}
