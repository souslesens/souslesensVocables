import { describe, test, expect } from "@jest/globals";
import OpenAPIResponseValidator from "openapi-response-validator";
import apiDoc from "../../api/v1/api-doc.js";

const ResponseValidatorClass = OpenAPIResponseValidator.default || OpenAPIResponseValidator;

const definitions = apiDoc.definitions || {};

function collectRefs(node, refs) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
        for (const child of node) collectRefs(child, refs);
        return;
    }
    if (typeof node.$ref === "string") refs.push(node.$ref);
    for (const key of Object.keys(node)) {
        if (key === "$ref") continue;
        collectRefs(node[key], refs);
    }
}

function findStructuralIssues(definitionName, schema, parentPath = "") {
    const issues = [];
    if (!schema || typeof schema !== "object") return issues;

    const here = `${definitionName}${parentPath}`;

    if (schema.type === "object") {
        const hasProperties = schema.properties && Object.keys(schema.properties).length > 0;
        const hasAdditional = schema.additionalProperties !== undefined && schema.additionalProperties !== false;
        if (!hasProperties && !hasAdditional) {
            issues.push(`${here}: type:"object" without properties or additionalProperties`);
        }
    }

    if (schema.type === "array") {
        const items = schema.items;
        const itemsEmpty = !items || (typeof items === "object" && Object.keys(items).length === 0);
        if (itemsEmpty) issues.push(`${here}: type:"array" with empty items {}`);
    }

    if (Array.isArray(schema.required) && schema.properties) {
        for (const requiredName of schema.required) {
            if (!(requiredName in schema.properties)) {
                issues.push(`${here}: required name "${requiredName}" not in properties`);
            }
            const requiredFieldSchema = schema.properties[requiredName];
            if (requiredFieldSchema && requiredFieldSchema.type === "null") {
                issues.push(`${here}: required name "${requiredName}" has type:"null" — contradictory`);
            }
        }
    }

    if (schema.properties) {
        for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
            issues.push(...findStructuralIssues(definitionName, propertySchema, `${parentPath}.${propertyName}`));
        }
    }
    if (schema.items) {
        issues.push(...findStructuralIssues(definitionName, schema.items, `${parentPath}[]`));
    }
    if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
        issues.push(...findStructuralIssues(definitionName, schema.additionalProperties, `${parentPath}{*}`));
    }
    return issues;
}

describe("apiDoc.definitions integrity", () => {
    test("every $ref resolves to an existing definition", () => {
        const collectedRefs = [];
        collectRefs(definitions, collectedRefs);
        const brokenRefs = collectedRefs.filter((ref) => {
            const match = ref.match(/^#\/definitions\/(.+)$/);
            if (!match) return true;
            return !(match[1] in definitions);
        });
        expect(brokenRefs).toEqual([]);
    });

    test("no top-level definition is missing the type field (where applicable)", () => {
        const definitionsWithoutType = [];
        for (const [name, definition] of Object.entries(definitions)) {
            if (typeof definition !== "object" || definition === null) continue;
            if (definition.$ref) continue;
            if (definition.allOf || definition.oneOf || definition.anyOf) continue;
            if (!definition.type && !definition.additionalProperties) {
                definitionsWithoutType.push(name);
            }
        }
        expect(definitionsWithoutType).toEqual([]);
    });

    test("no structural issues across all definitions", () => {
        const allIssues = [];
        for (const [name, definition] of Object.entries(definitions)) {
            allIssues.push(...findStructuralIssues(name, definition));
        }
        expect(allIssues).toEqual([]);
    });

    test("each definition compiles as a JSON Schema for OpenAPIResponseValidator", () => {
        const compileFailures = [];
        for (const [name, definition] of Object.entries(definitions)) {
            try {
                new ResponseValidatorClass({
                    definitions,
                    responses: { 200: { description: "test", schema: definition } },
                });
            } catch (compileError) {
                compileFailures.push(`${name}: ${compileError.message}`);
            }
        }
        expect(compileFailures).toEqual([]);
    });
});
