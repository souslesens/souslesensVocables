import N3 from "n3";
import fetch from "node-fetch";
import { rdfDataModel } from "../../model/rdfData.js";
import Ask from "../ask.js";

const rdfTypeIri = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const xsdStringIri = "http://www.w3.org/2001/XMLSchema#string";
const owlVersionInfoIri = "http://www.w3.org/2002/07/owl#versionInfo";

// written in every file even when unused, so the header never changes between two versions
const commonPrefixes = {
    dc: "http://purl.org/dc/elements/1.1/",
    dcterms: "http://purl.org/dc/terms/",
    owl: "http://www.w3.org/2002/07/owl#",
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
    skos: "http://www.w3.org/2004/02/skos/core#",
    xsd: "http://www.w3.org/2001/XMLSchema#",
};

// a safe subset of the Turtle PN_LOCAL grammar, any other local name keeps the full IRI
const prefixedLocalNameRegex = /^[A-Za-z_][A-Za-z0-9_-]*$/;
// Turtle escapes the control characters, so these two regexes match them on purpose
/* eslint-disable no-control-regex */
const literalCharacterToEscapeRegex = /[\\"\u0000-\u001f]/g;
const iriCharacterToEscapeRegex = /[\u0000- <>"{}|^`\\]/g;
/* eslint-enable no-control-regex */
const literalEscapes = { "\\": "\\\\", '"': '\\"', "\n": "\\n", "\r": "\\r", "\t": "\\t" };

/**
 * The N-Triples of a source, read the way the Download menu reads them: through sls-py-api when it
 * is enabled, else through the paged export of GET /api/v1/rdf/graph. The source alone, without its imports.
 * @param {string} sourceName - the source name
 * @param {object} source - the source descriptor of sources.json
 * @param {object} user - the logged user, whose token sls-py-api checks
 * @param {object} config - the main config
 * @returns {Promise<string>} the N-Triples text
 */
async function readSourceNTriples(sourceName, source, user, config) {
    const pages = [];
    let offset = 0;
    if (config.slsPyApi.enabled) {
        const pythonApiGraphUrl = Ask.withoutTrailingSlash(config.slsPyApi.url) + "/api/v2/rdf/graph";
        while (offset !== null) {
            const queryParameters = new URLSearchParams({ source: sourceName, offset: String(offset), format: "nt", skipNamedIndividuals: "false", withImports: "false" });
            const response = await fetch(pythonApiGraphUrl + "?" + queryParameters.toString(), { headers: { Authorization: "Bearer " + user.token } });
            // the status first: an error page of a proxy in front of sls-py-api is not JSON
            if (response.status !== 200) {
                const errorText = await response.text();
                throw new Error("sls-py-api could not export " + sourceName + ": " + response.status + " " + errorText);
            }
            const responseBody = await response.json();
            pages.push(responseBody.data);
            offset = responseBody.next_offset;
        }
        const pythonApiNTriples = pages.join("\n");
        return pythonApiNTriples;
    }
    while (offset !== null) {
        const page = await rdfDataModel.getGraphDownloadPage(source.graphUri, source.owner, [], config.sparqlDownloadLimit, offset);
        pages.push(page.graphPartNt);
        offset = page.nextOffset;
    }
    const nTriples = pages.join("\n");
    return nTriples;
}

/**
 * @param {string} rdfText - N-Triples or Turtle
 * @returns {object[]} the N3 quads
 */
function parseQuads(rdfText) {
    // "_:" keeps the blank node labels as written, any other value renames them per parse
    const parser = new N3.Parser({ format: "Turtle", blankNodePrefix: "_:" });
    // SLS writes its fake blank nodes as the relative IRI <_:b...>, kept as written; any other one, from a @base of a branch
    // file edited by hand, is resolved. _resolveRelativeIRI is private to n3 (1.25.2): the @base test fails if it changes
    const resolveRelativeIri = parser._resolveRelativeIRI.bind(parser);
    parser._resolveRelativeIRI = (relativeIri) => (relativeIri.startsWith("_:") ? relativeIri : resolveRelativeIri(relativeIri));
    const quads = parser.parse(rdfText);
    return quads;
}

/**
 * Replaces the owl:versionInfo of the ontology node, so the archived file carries the published version.
 * @param {object[]} quads - the N3 quads of the source
 * @param {string} graphUri - the graph URI, subject of the ontology metadata
 * @param {string} versionInfo - the version written
 * @returns {object[]} the quads with one owl:versionInfo
 */
function withVersionInfo(quads, graphUri, versionInfo) {
    const otherQuads = quads.filter((quad) => !(quad.subject.value === graphUri && quad.predicate.value === owlVersionInfoIri));
    const versionInfoQuad = N3.DataFactory.quad(N3.DataFactory.namedNode(graphUri), N3.DataFactory.namedNode(owlVersionInfoIri), N3.DataFactory.literal(versionInfo));
    otherQuads.push(versionInfoQuad);
    return otherQuads;
}

/**
 * @param {string} graphUri - the graph URI of the source, its own prefix
 * @returns {Record<string, string>} the prefixes of the source file
 */
function prefixesOfSource(graphUri) {
    const prefixes = { ...commonPrefixes, "": graphUri };
    return prefixes;
}

function escapeAsUnicode(character) {
    const characterCode = character.charCodeAt(0);
    const hexadecimalCode = characterCode.toString(16);
    const upperHexadecimalCode = hexadecimalCode.toUpperCase();
    const unicodeEscape = "\\u" + upperHexadecimalCode.padStart(4, "0");
    return unicodeEscape;
}

function encodeIri(iri, prefixEntries) {
    for (const [prefixName, namespace] of prefixEntries) {
        if (!iri.startsWith(namespace)) {
            continue;
        }
        const localName = iri.slice(namespace.length);
        if (prefixedLocalNameRegex.test(localName)) {
            const prefixedName = prefixName + ":" + localName;
            return prefixedName;
        }
    }
    const escapedIri = iri.replace(iriCharacterToEscapeRegex, escapeAsUnicode);
    const fullIri = "<" + escapedIri + ">";
    return fullIri;
}

function encodeTerm(term, prefixEntries) {
    if (term.termType === "NamedNode") {
        const encodedIri = encodeIri(term.value, prefixEntries);
        return encodedIri;
    }
    if (term.termType === "BlankNode") {
        const blankNodeLabel = "_:" + term.value;
        return blankNodeLabel;
    }
    const escapedValue = term.value.replace(literalCharacterToEscapeRegex, (character) => literalEscapes[character] || escapeAsUnicode(character));
    const quotedValue = '"' + escapedValue + '"';
    if (term.language) {
        const languageLiteral = quotedValue + "@" + term.language;
        return languageLiteral;
    }
    if (term.datatype.value === xsdStringIri) {
        return quotedValue;
    }
    const typedLiteral = quotedValue + "^^" + encodeIri(term.datatype.value, prefixEntries);
    return typedLiteral;
}

function compareTriples(firstTriple, secondTriple) {
    if (firstTriple.subject !== secondTriple.subject) {
        return firstTriple.subject < secondTriple.subject ? -1 : 1;
    }
    // rdf:type first in a subject block, as Turtle writers do
    const firstPredicateKey = firstTriple.predicate === "a" ? "" : firstTriple.predicate;
    const secondPredicateKey = secondTriple.predicate === "a" ? "" : secondTriple.predicate;
    if (firstPredicateKey !== secondPredicateKey) {
        return firstPredicateKey < secondPredicateKey ? -1 : 1;
    }
    if (firstTriple.object !== secondTriple.object) {
        return firstTriple.object < secondTriple.object ? -1 : 1;
    }
    return 0;
}

/**
 * The triples written as Turtle terms, without duplicates, sorted on the raw characters so the same
 * graph always gives the same order whatever order the triple store returned.
 * @param {object[]} quads - the N3 quads
 * @param {Record<string, string>} prefixes - the prefixes of the file
 * @returns {{subject: string, predicate: string, object: string}[]} the sorted triples
 */
function canonicalTriples(quads, prefixes) {
    const prefixEntries = Object.entries(prefixes);
    // the longest namespace wins when two prefixes match
    prefixEntries.sort((firstEntry, secondEntry) => secondEntry[1].length - firstEntry[1].length);
    const triplesByLine = new Map();
    for (const quad of quads) {
        const predicate = quad.predicate.value === rdfTypeIri ? "a" : encodeIri(quad.predicate.value, prefixEntries);
        const triple = { subject: encodeTerm(quad.subject, prefixEntries), predicate: predicate, object: encodeTerm(quad.object, prefixEntries) };
        triplesByLine.set(tripleLine(triple), triple);
    }
    const triples = Array.from(triplesByLine.values());
    triples.sort(compareTriples);
    return triples;
}

function tripleLine(triple) {
    const line = triple.subject + " " + triple.predicate + " " + triple.object + " .";
    return line;
}

/**
 * One triple per line, every line ended by " ;" and every subject block by a lone ".", so adding or
 * removing a triple changes exactly one line of the file.
 * @param {{subject: string, predicate: string, object: string}[]} triples - the sorted triples
 * @param {Record<string, string>} prefixes - the prefixes of the file
 * @returns {string} the Turtle text
 */
function writeTurtle(triples, prefixes) {
    const turtleLines = [];
    for (const [prefixName, namespace] of Object.entries(prefixes)) {
        turtleLines.push("@prefix " + prefixName + ": <" + namespace + "> .");
    }
    const triplesBySubject = new Map();
    for (const triple of triples) {
        if (!triplesBySubject.has(triple.subject)) {
            triplesBySubject.set(triple.subject, []);
        }
        triplesBySubject.get(triple.subject).push(triple);
    }
    for (const [subject, subjectTriples] of triplesBySubject) {
        turtleLines.push("", subject);
        for (const triple of subjectTriples) {
            turtleLines.push("    " + triple.predicate + " " + triple.object + " ;");
        }
        turtleLines.push("    .");
    }
    const turtleText = turtleLines.join("\n") + "\n";
    return turtleText;
}

/**
 * @param {{subject: string, predicate: string, object: string}[]} previousTriples - the triples of the branch
 * @param {{subject: string, predicate: string, object: string}[]} currentTriples - the triples of SLS
 * @returns {{addedLines: string[], removedLines: string[]}} the triples written as one line each
 */
function diffTriples(previousTriples, currentTriples) {
    const previousLines = previousTriples.map(tripleLine);
    const currentLines = currentTriples.map(tripleLine);
    const previousLineSet = new Set(previousLines);
    const currentLineSet = new Set(currentLines);
    const addedLines = currentLines.filter((line) => !previousLineSet.has(line));
    const removedLines = previousLines.filter((line) => !currentLineSet.has(line));
    return { addedLines: addedLines, removedLines: removedLines };
}

export { readSourceNTriples, parseQuads, withVersionInfo, prefixesOfSource, canonicalTriples, writeTurtle, diffTriples, owlVersionInfoIri };
