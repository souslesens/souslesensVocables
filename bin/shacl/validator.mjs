import rdf from "@zazuko/env-node";
import SHACLValidator from "rdf-validate-shacl";
import { rdfParser } from "rdf-parse";
import streamifyString from "streamify-string";
import { Writer as N3Writer } from "n3";

const PREFIXES = { sh: "http://www.w3.org/ns/shacl#" };

async function parseTurtle(source) {
    const dataset = rdf.dataset();
    const stream = rdfParser.parse(streamifyString(source), {
        contentType: "text/turtle",
        baseIRI: "",
    });
    return dataset.import(stream);
}

function serializeReport(dataset) {
    const writer = new N3Writer({ prefixes: PREFIXES });
    writer.addQuads([...dataset]);
    return new Promise((resolve, reject) => {
        writer.end((error, result) => (error ? reject(error) : resolve(result)));
    });
}

export async function validateTriples(shapes, triples) {
    const shapeDataset = await parseTurtle(shapes);
    const dataDataset = await parseTurtle(triples);

    const validator = new SHACLValidator(shapeDataset, { factory: rdf });
    const report = await validator.validate(dataDataset);
var result2=[]
    for (const result of report.results) {
        result2.push({
            subject: result.focusNode,
            path: result.path,
            value: result.value,
            messages: result.message.map(m => m.value),
            constraint: result.sourceConstraintComponent?.value
        })
    }




   // return serializeReport(report.dataset);
    return JSON.stringify(result2);
}
