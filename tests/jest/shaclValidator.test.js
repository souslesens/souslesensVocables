import { describe, test, expect } from "@jest/globals";
import { validateTriples } from "../../bin/shacl/validator.mjs";

const shape = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix ex: <http://example.org/> .
ex:AssetShape a sh:NodeShape ; sh:targetClass ex:Asset ; sh:property [ sh:path ex:id ; sh:minCount 1 ] .`;

describe("validateTriples", () => {
    test("returns no violations for conforming data", async () => {
        const data = `<http://example.org/asset/1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.org/Asset> ;
    <http://example.org/id> "a1" .`;
        const report = await validateTriples(shape, data);
        expect(report).not.toContain("sh:ValidationResult");
    });

    test("reports violations for non-conforming data", async () => {
        const data = `<http://example.org/asset/1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.org/Asset> .`;
        const report = await validateTriples(shape, data);
        expect(report).toContain("sh:ValidationResult");
    });

    test("rejects on malformed Turtle", async () => {
        await expect(validateTriples("not valid turtle", "data")).rejects.toThrow();
    });
});
