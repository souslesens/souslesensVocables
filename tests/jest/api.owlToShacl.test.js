import { describe, test, expect } from "@jest/globals";
import { Parser } from "n3";
import owlToShaclRoute from "../../api/v1/paths/owlToShacl.js";

const owlNamespace = "http://www.w3.org/2002/07/owl#";
const shaclNamespace = "http://www.w3.org/ns/shacl#";
const nonNegativeIntegerIri = "http://www.w3.org/2001/XMLSchema#nonNegativeInteger";

function restrictionRow(nodeId, constraintType, value, cardinalityType, cardinality) {
    const row = {
        subject: { type: "uri", value: "http://example.org/Pump" },
        node: { type: "bnode", value: nodeId },
        prop: { type: "uri", value: "http://example.org/hasPart" },
        constraintType: { type: "uri", value: owlNamespace + constraintType },
        value: { type: "uri", value: value },
    };
    if (cardinalityType) {
        row.cardinalityType = { type: "uri", value: owlNamespace + cardinalityType };
        row.cardinalityValue = { type: "typed-literal", datatype: nonNegativeIntegerIri, value: cardinality };
    }
    return row;
}

function callPost(body) {
    return new Promise((resolve) => {
        const response = {
            statusCode: 200,
            body: null,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(payload) {
                this.body = payload;
                resolve(this);
            },
            send(payload) {
                this.body = payload;
                resolve(this);
            },
            setHeader() {},
        };
        owlToShaclRoute().POST({ body: body }, response);
    });
}

function qualifiedCountsOf(turtle, onClassIri) {
    const quads = new Parser().parse(turtle);
    const valueShapeQuad = quads.find((quad) => quad.predicate.value === shaclNamespace + "class" && quad.object.value === onClassIri);
    const propertyShapeQuad = quads.find((quad) => quad.predicate.value === shaclNamespace + "qualifiedValueShape" && quad.object.equals(valueShapeQuad.subject));
    const propertyShapeQuads = quads.filter((quad) => quad.subject.equals(propertyShapeQuad.subject));
    const counts = {};
    propertyShapeQuads.forEach((quad) => {
        if (quad.predicate.value === shaclNamespace + "qualifiedMinCount") {
            counts.min = quad.object.value;
        }
        if (quad.predicate.value === shaclNamespace + "qualifiedMaxCount") {
            counts.max = quad.object.value;
        }
    });
    return counts;
}

describe("owlToShacl route", () => {
    test("exposes only POST with a documented contract", () => {
        const operations = owlToShaclRoute();
        expect(Object.keys(operations)).toEqual(["POST"]);
        const bodyParam = operations.POST.apiDoc.parameters.find((param) => param.in === "body");
        expect(bodyParam.schema.required).toEqual(["restrictions"]);
        expect(Object.keys(operations.POST.apiDoc.responses)).toEqual(expect.arrayContaining(["200", "400", "500"]));
    });

    test("rejects a missing or empty restriction list with 400", async () => {
        const emptyResponse = await callPost({ restrictions: [] });
        expect(emptyResponse.statusCode).toBe(400);
        const missingResponse = await callPost({});
        expect(missingResponse.statusCode).toBe(400);
    });

    test("maps qualified cardinalities to the expected SHACL counts", async () => {
        const response = await callPost({
            restrictions: [
                restrictionRow("b1", "onClass", "http://example.org/Motor", "qualifiedCardinality", "1"),
                restrictionRow("b2", "onClass", "http://example.org/Seal", "minQualifiedCardinality", "1"),
                restrictionRow("b3", "onClass", "http://example.org/Valve", "maxQualifiedCardinality", "3"),
            ],
        });
        expect(response.statusCode).toBe(200);
        expect(response.body.targetClasses).toEqual(["http://example.org/Pump"]);

        expect(qualifiedCountsOf(response.body.turtle, "http://example.org/Motor")).toEqual({ min: "1", max: "1" });
        expect(qualifiedCountsOf(response.body.turtle, "http://example.org/Seal")).toEqual({ min: "1" });
        expect(qualifiedCountsOf(response.body.turtle, "http://example.org/Valve")).toEqual({ min: "0", max: "3" });
    });

    test("reports an unconvertible restriction with 500", async () => {
        const response = await callPost({ restrictions: [restrictionRow("b9", "onClass", "http://example.org/Motor")] });
        expect(response.statusCode).toBe(500);
        expect(response.body.message).toContain("needs at least one supported restriction predicate");
    });
});
