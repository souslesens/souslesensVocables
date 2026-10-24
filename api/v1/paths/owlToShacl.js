import { Parser, Writer, DataFactory } from "n3";
import { failure } from "./utils.js";
import { transformOwlRestrictions, NS } from "../../../bin/shacl/owl-to-shacl_triplesl.mjs";

const qualifiedMinCountIri = NS.sh + "qualifiedMinCount";
const qualifiedMaxCountIri = NS.sh + "qualifiedMaxCount";

/**
 * Makes the optionality of a max qualified cardinality explicit: every property shape carrying
 * sh:qualifiedMaxCount without sh:qualifiedMinCount gets sh:qualifiedMinCount 0.
 * @function
 * @name addExplicitQualifiedMinCount
 * @param {string} shapesTurtle - SHACL shapes produced by transformOwlRestrictions.
 * @param {Function} callback - Error-first callback `(err, turtle)`.
 * @returns {void}
 */
function addExplicitQualifiedMinCount(shapesTurtle, callback) {
    var quads;
    try {
        quads = new Parser({ format: "Turtle" }).parse(shapesTurtle);
    } catch (e) {
        return callback(e);
    }

    var shapesWithMinCount = new Set();
    quads.forEach(function (quad) {
        if (quad.predicate.value === qualifiedMinCountIri) {
            shapesWithMinCount.add(quad.subject.value);
        }
    });

    var zeroCount = DataFactory.literal("0", DataFactory.namedNode(NS.xsd + "integer"));
    var completedQuads = [];
    quads.forEach(function (quad) {
        if (quad.predicate.value === qualifiedMaxCountIri && !shapesWithMinCount.has(quad.subject.value)) {
            completedQuads.push(DataFactory.quad(quad.subject, DataFactory.namedNode(qualifiedMinCountIri), zeroCount));
        }
        completedQuads.push(quad);
    });

    var writer = new Writer({ prefixes: { sh: NS.sh, xsd: NS.xsd } });
    writer.addQuads(completedQuads);
    writer.end(callback);
}

export default function () {
    let operations = {
        POST,
    };

    POST.apiDoc = {
        summary: "Convert OWL restrictions into SHACL shapes",
        description:
            "Converts `body.restrictions` (rows returned by `Sparql_OWL.getObjectRestrictions`) into SHACL Core shapes with " +
            "`transformOwlRestrictions` (`bin/shacl/owl-to-shacl_triplesl.mjs`). `owl:qualifiedCardinality n` gives " +
            "`sh:qualifiedMinCount n` and `sh:qualifiedMaxCount n`, `owl:minQualifiedCardinality n` gives `sh:qualifiedMinCount n`, " +
            "`owl:maxQualifiedCardinality n` gives `sh:qualifiedMinCount 0` and `sh:qualifiedMaxCount n`.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "owlToShacl",
        parameters: [
            {
                in: "body",
                name: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["restrictions"],
                    properties: {
                        restrictions: {
                            type: "array",
                            description: "SPARQL JSON bindings with `subject`, `node`, `prop`, `constraintType`, `value`, and optionally `cardinalityType` and `cardinalityValue`.",
                            items: { type: "object" },
                        },
                    },
                    example: {
                        restrictions: [
                            {
                                subject: { type: "uri", value: "http://example.org/Pump" },
                                node: { type: "bnode", value: "b0" },
                                prop: { type: "uri", value: "http://example.org/hasPart" },
                                constraintType: { type: "uri", value: "http://www.w3.org/2002/07/owl#onClass" },
                                value: { type: "uri", value: "http://example.org/Motor" },
                                cardinalityType: { type: "uri", value: "http://www.w3.org/2002/07/owl#maxQualifiedCardinality" },
                                cardinalityValue: { type: "typed-literal", datatype: "http://www.w3.org/2001/XMLSchema#nonNegativeInteger", value: "1" },
                            },
                        ],
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "SHACL shapes in Turtle, the classes they target and the converter warnings.",
                schema: {
                    type: "object",
                    properties: {
                        turtle: { type: "string" },
                        targetClasses: { type: "array", items: { type: "string" } },
                        warnings: { type: "array", items: { type: "string" } },
                    },
                },
            },
            400: { description: "Invalid request: `restrictions` must be a non-empty array." },
            500: { description: "Conversion error, e.g. an OWL construct the converter does not support." },
        },
        tags: ["Misc"],
    };

    function POST(req, res, next) {
        var restrictions = (req.body || {}).restrictions;
        if (!Array.isArray(restrictions) || restrictions.length === 0) {
            return failure(res, 400, "restrictions must be a non-empty array");
        }
        // the converter reports unsupported OWL constructs by throwing
        var conversion;
        try {
            conversion = transformOwlRestrictions(restrictions, { layout: "restriction-rows", shapeIds: "hash" });
        } catch (e) {
            return failure(res, 500, e.message);
        }
        addExplicitQualifiedMinCount(conversion.turtle, function (err, turtle) {
            if (err) {
                return failure(res, 500, err.message);
            }
            var targetClasses = conversion.shapes.map(function (shape) {
                return shape.targetClass.value;
            });
            res.status(200).json({
                turtle: turtle,
                targetClasses: targetClasses,
                warnings: conversion.warnings,
            });
        });
    }

    return operations;
}
