<<<<<<< HEAD
import { jest } from "@jest/globals";

import { convertType, chunk, cleanupConnection, getKnexConnection, redoIfFailure } from "../model/utils.js";

describe("redoIfFailure", () => {
    test("redo", async () => {
        let ntry = 0;
        const noThrowAtThirdCall = async () => {
            ntry += 1;
            if (ntry <= 3) {
                throw `Throw error at call ${ntry}`;
            }
        };

        await redoIfFailure(noThrowAtThirdCall, 4, 0.001);
        expect(ntry).toBe(4);
    });
});
=======
const { convertType, chunk, cleanupConnection, getKnexConnection, addFromsToSparqlQuery } = require("../model/utils");
const fs = require("node:fs");
>>>>>>> f07e45c87 (feat(utils): add a addFromsToSparqlQuery function)

describe("convertTypeUtils", () => {
    test("Convert string to boolean", async () => {
        expect(convertType("false")).toStrictEqual(false);
        expect(convertType("true")).toStrictEqual(true);
        expect(convertType("truetrue")).toStrictEqual("truetrue");
    });

    test("Convert string to number", async () => {
        expect(convertType("42")).toStrictEqual(42);
        expect(convertType("-7")).toStrictEqual(-7);
        expect(convertType("+0")).toStrictEqual(0);
    });

    test("Convert string to float", async () => {
        expect(convertType("13.37")).toStrictEqual(13.37);
        expect(convertType("-42.")).toStrictEqual(-42.0);
        expect(convertType("314e-2")).toStrictEqual(3.14);
        expect(convertType("0.0314E+2")).toStrictEqual(3.14);
        expect(convertType("-1.7976931348623159e+308")).toStrictEqual(-Infinity);
    });

    test("Do not convert non-string values", async () => {
        expect(convertType(false)).toStrictEqual(false);
        expect(convertType(42)).toStrictEqual(42);
        expect(convertType(13.37)).toStrictEqual(13.37);
    });
});

describe("chunkUtils", () => {
    test("Chunk list of 4 element in 2", async () => {
        expect(chunk([1, 2, 3, 4], 2)).toStrictEqual([
            [1, 2],
            [3, 4],
        ]);
    });
    test("Chunk list of 5 element in 2", async () => {
        expect(chunk([1, 2, 3, 4, 5], 2)).toStrictEqual([[1, 2], [3, 4], [5]]);
    });
    test("Chunk list of 4 element in 10", async () => {
        expect(chunk([1, 2, 3, 4], 10)).toStrictEqual([[1, 2, 3, 4]]);
    });
    test("Chunk list of 4 element in 0", async () => {
        expect(chunk([1, 2, 3, 4], 0)).toStrictEqual([[1, 2, 3, 4]]);
    });
    test("Chunk list of 4 element in -1", async () => {
        expect(chunk([1, 2, 3, 4], -1)).toStrictEqual([[1, 2, 3, 4]]);
    });
});

describe("knex functions", () => {
    test("get a false knex connection", async () => {
        const connection = getKnexConnection({});
        expect(connection.client).toBeDefined();
    });

    test("destroy the knex connection", async () => {
        const connection = { destroy: jest.fn() };
        cleanupConnection(connection);
        expect(connection.destroy).toHaveBeenCalled();
    });
});

describe("addFromToSparqlQuery", () => {
    test("add FROM to a simple SPARQL query", async () => {
        const sparql = "SELECT * WHERE { ?s ?p ?o .}";
        const expected = "SELECT * FROM <http://toto.com/example>\nWHERE { ?s ?p ?o. }";
        expect(addFromsToSparqlQuery(sparql, ["http://toto.com/example"])).toStrictEqual(expected);
    });
    test("add FROM to a complexe SPARQL query", async () => {
        const sparql = fs.readFileSync("./tests/data/sparql/bsbm4.sparql", "utf8");
        const expected = fs.readFileSync("./tests/data/sparql/bsbm4_FROM.sparql", "utf8").slice(0, -1); // slice to remove last \n
        expect(addFromsToSparqlQuery(sparql, ["http://toto.com/example"])).toStrictEqual(expected);
    });
    test("replace FROM", async () => {
        const sparql = "SELECT * FROM <urn:a:b:c> FROM <urn:d:e:f> WHERE { ?s ?p ?o .}";
        const expected = "SELECT * FROM <http://toto.com/example>\nWHERE { ?s ?p ?o. }";
        expect(addFromsToSparqlQuery(sparql, ["http://toto.com/example"], true)).toStrictEqual(expected);
    });
    test("append FROM", async () => {
        const sparql = "SELECT * FROM <urn:a:b:c> FROM <urn:d:e:f> WHERE { ?s ?p ?o .}";
        const expected = "SELECT * FROM <urn:a:b:c>\nFROM <urn:d:e:f>\nFROM <http://toto.com/example>\nWHERE { ?s ?p ?o. }";
        expect(addFromsToSparqlQuery(sparql, ["http://toto.com/example"], false)).toStrictEqual(expected);
    });
    test("replace FROM with 2 FROM", async () => {
        const sparql = "SELECT * FROM <urn:a:b:c> FROM <urn:d:e:f> WHERE { ?s ?p ?o .}";
        const expected = "SELECT * FROM <http://toto.com/example>\nFROM <http://titi.com/toto>\nWHERE { ?s ?p ?o. }";
        expect(addFromsToSparqlQuery(sparql, ["http://toto.com/example", "http://titi.com/toto"], true)).toStrictEqual(expected);
    });
    test("append FROM with 2 FROM", async () => {
        const sparql = "SELECT * FROM <urn:a:b:c> FROM <urn:d:e:f> WHERE { ?s ?p ?o .}";
        const expected = "SELECT * FROM <urn:a:b:c>\nFROM <urn:d:e:f>\nFROM <http://toto.com/example>\nFROM <http://titi.com/toto>\nWHERE { ?s ?p ?o. }";
        expect(addFromsToSparqlQuery(sparql, ["http://toto.com/example", "http://titi.com/toto"], false)).toStrictEqual(expected);
    });
});
