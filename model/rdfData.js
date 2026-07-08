import { readMainConfig } from "./config.js";
import DigestClient from "digest-fetch";
import fetch from "node-fetch";
import { RDF_FORMATS_MIMETYPES, sleep } from "./utils.js";

// Number of triples moved per SPARQL Update batch in moveGraph. Keeps each request small enough
// to avoid the triplestore's query-execution timeout on graphs with many triples.
const GRAPH_MOVE_BATCH_SIZE = 5000;
const GRAPH_URI_REWRITE_BATCH_SIZE = 5000;

class RdfDataModel {
    /**
     * @param {string} endpointUrl - url of endpoint
     * @param {string} endpointUser - user of endpoint
     * @param {string} endpointPassword - password of endpoint
     */
    constructor(endpointUrl, endpointUser, endpointPassword) {
        this.endpointUrl = endpointUrl;
        this.endpointUser = endpointUser;
        this.endpointPassword = endpointPassword;
    }
    /**
     * @param {string} query - SPARQL query string
     * @param {string} format - output format (json, csv, nt, ttl)
     * @returns {Promise<any>} results
     */
    execQuery = async (query, format = "json") => {
        if (!(format in RDF_FORMATS_MIMETYPES)) {
            const message = `${format} is not a valid format (${Object.keys(RDF_FORMATS_MIMETYPES).join(", ")})`;
            throw Error(message, { cause: 400 });
        }

        const urlParams = new URLSearchParams({
            query: query,
            format: RDF_FORMATS_MIMETYPES[format],
        });
        const url = new URL(`${this.endpointUrl}?${urlParams.toString()}`).href;
        let response;
        if (this.endpointUser && this.endpointPassword) {
            const client = new DigestClient(this.endpointUser, this.endpointPassword, { basic: false });
            response = await client.fetch(url);
        } else {
            response = await fetch(url);
        }
        if (response.status !== 200) {
            throw new Error(await response.text());
        }
        if (format === "json") {
            const json = await response.json();
            const bindings = json["results"]["bindings"];
            return bindings;
        } else {
            const nt = await response.text();
            return nt;
        }
    };

    getGraphs = async () => {
        const query = "SELECT DISTINCT ?graph count(?s) as ?number_of_triples WHERE { GRAPH ?graph { ?s ?p ?o . }}";
        const json = await this.execQuery(query);
        const graphs = json.map((r) => {
            return {
                name: r.graph.value,
                count: r.number_of_triples.value,
            };
        });
        // default graph in virtuoso
        const graphsToExclude = [
            "urn:activitystreams-owl:map",
            "http://www.openlinksw.com/schemas/virtrdf#",
            "http://localhost:8890/DAV/",
            "http://www.w3.org/2002/07/owl#",
            "http://www.w3.org/ns/ldp#",
            "urn:core:services:sparql",
        ];
        const cleanedGraphs = graphs.filter((g) => {
            if (!graphsToExclude.includes(g.name)) {
                return g;
            }
        });
        return cleanedGraphs;
    };
    /**
     * @param {string} graphUri - the graph URI
     * @param {string[]} withImports - array of uri to get
     * @returns {Promise<number>} - number of triples
     */
    getTripleCount = async (graphUri, withImports = []) => {
        const fromStr = withImports.map((uri) => `FROM <${uri}>`).join("\n");
        const query = `SELECT COUNT(*) as ?total
                       FROM <${graphUri}>
                       ${fromStr}
                       WHERE {
                           ?s ?p ?o .
                       }`;
        const json = await this.execQuery(query);
        return Number(json[0]["total"]["value"]);
    };

    /**
     * @param {string} graphUri - the graph URI
     * @returns {Promise<any>} - response
     */
    getRdfMetadata = async (graphUri) => {
        const query = `SELECT *
                       FROM <${graphUri}>
                       WHERE { <${graphUri}> ?key ?value . }`;
        const json = await this.execQuery(query);
        const result = json.map((entry) => {
            return { metadata: entry.key.value, ...entry.value };
        });
        return result;
    };

    /**
     * @param {string} graphUri - the graph URI
     * @param {string[]} triple - array of 3 elem
     * @returns {Promise<boolean>} - true if the triple exists
     */
    ask = async (graphUri, triple) => {
        const s = triple[0] === null ? "?s" : triple[0];
        const p = triple[1] === null ? "?p" : triple[1];
        const o = triple[2] === null ? "?o" : triple[2];
        const query = `ASK FROM <${graphUri}> { ${s} ${p} ${o} . }`;
        const result = await this.execQuery(query, "nt");
        return result === "true";
    };

    /**
     * @param {string} graphUri - the graph URI
     * @param {string} contributor - contributor name
     * @param {string} sep - separator, default is \t
     * @returns {string[]} - a triple
     */
    genContributorTriple = (graphUri, contributor, sep = "\t") => {
        const s = `<${graphUri}>`;
        const p = "<http://purl.org/dc/elements/1.1/contributor>";
        const o = `"${contributor}"^^<http://www.w3.org/2001/XMLSchema#string>`;
        return [s, p, o];
    };

    /**
     * @param {string} graphUri - the graph URI
     * @param {string[]} importUris - list of import uris
     * @param {string} sep - separator, default is \t
     * @returns {string[][]} - a list of triples
     */
    genImportTriples = (graphUri, importUris, sep = "\t") => {
        const triples = importUris.map((importUri) => {
            const s = `<${graphUri}>`;
            const p = "<http://www.w3.org/2002/07/owl#imports>";
            const o = `<${importUri}>`;
            return [s, p, o];
        });
        return triples;
    };

    formatTripleToNt = (s, p, o, sep = "\t") => {
        return `${s}${sep}${p}${sep}${o} .`;
    };

    /**
     * @param {string} graphUri - the graph URI
     */
    _dropMetadata = async (graphUri) => {
        const query = `WITH <${graphUri}>
                       DELETE { <${graphUri}> ?p ?o }
                       WHERE {
                         <${graphUri}> ?p ?o .
                       }`;
        await this.execQuery(query);
    };

    /**
     * @param {any} metadataEntry - a metadata object
     * @returns {string} - formated object
     */
    _formatObject = (metadataEntry) => {
        const type = metadataEntry.type;
        //escape the quote
        const value = metadataEntry.value.replace(/"/g, '\\"');
        if (type === "uri") {
            return `<${value}>`;
        }

        if (type === "typed-literal") {
            return `"${value}"^^<${metadataEntry.datatype}>`;
        }

        if (type == "literal" && "xml:lang" in metadataEntry) {
            return `"${value}"@${metadataEntry["xml:lang"]}`;
        }

        return `"${value}"`;
    };

    /**
     * @param {string} graphUri - the graph URI
     * @param {any[]} metadata - The new metadata array
     * @returns {Promise<any>} - The new metadata array
     */
    rewritesMetadata = async (graphUri, metadata) => {
        await this._dropMetadata(graphUri);
        for (const i in metadata) {
            const m = metadata[i];
            const object = this._formatObject(m);
            const query = `INSERT DATA {
                             GRAPH <${graphUri}> {
                               <${graphUri}> <${m.metadata}> ${object} .
                             }
                           }`;
            await this.execQuery(query);
        }

        return await this.getRdfMetadata(graphUri);
    };

    removeMetadata = async (graphUri, metadata) => {
        for (const i in metadata) {
            const m = metadata[i];
            const object = this._formatObject(m);
            const query = `WITH <${graphUri}>
                           DELETE { <${graphUri}> <${m.metadata}> ${object} }
                           WHERE { <${graphUri}> <${m.metadata}> ${object} }`;
            await this.execQuery(query);
        }
    };

    addMetadata = async (graphUri, metadata) => {
        for (const i in metadata) {
            const m = metadata[i];
            const object = this._formatObject(m);
            const query = `INSERT DATA {
                             GRAPH <${graphUri}> {
                               <${graphUri}> <${m.metadata}> ${object} .
                             }
                           }`;
            await this.execQuery(query);
        }
    };

    /**
     * @param {string} graphUri - the graph URI
     * @returns {Promise<number>} - number of triples per page
     */
    getPageSize = async (graphUri) => {
        const query = `SELECT *
                       FROM <${graphUri}>
                       WHERE { ?s ?p ?o . }`;
        const json = await this.execQuery(query);
        return json.length;
    };

    /**
     * @param {string} graphUri - the graph URI
     * @param {string} limit - SPARQL LIMIT
     * @param {string} offset - SPARQL OFFSET
     * @param {boolean} jsonOutput - JSON output format
     * @param {string[]} withImports - array of uri to get
     * @returns {Promise<any>} - the RDF data
     */
    getGraphPart = async (graphUri, limit, offset, jsonOutput, withImports = []) => {
        const fromStr = withImports.map((uri) => `FROM <${uri}>`).join("\n");

        const query = `CONSTRUCT { ?s ?p ?o .}
                       FROM <${graphUri}>
                       ${fromStr}
                       WHERE { ?s ?p ?o .}
                       LIMIT ${limit}
                       OFFSET ${offset}`;
        const json = await this.execQuery(query, jsonOutput ? "json" : "nt");
        return json;
    };

    /**
     * @param {string} graphUri - the graph URI
     * @param {string} limit - SPARQL LIMIT
     * @param {string} offset - SPARQL OFFSET
     * @param {string[]} withImports - array of uri to get
     * @returns {Promise<any>} - the RDF data
     */
    getGraphPartNt = async (graphUri, limit, offset, withImports = []) => {
        return await this.getGraphPart(graphUri, limit, offset, false, withImports);
    };

    /**
     * Moves all triples from sourceGraphUri to targetGraphUri, batch by batch, so a single
     * SPARQL Update statement never has to touch the whole graph at once (which times out on
     * large graphs).
     * @param {string} sourceGraphUri - The graph to move triples out of
     * @param {string} targetGraphUri - The graph to move triples into
     * @returns {Promise<void>}
     */
    moveGraph = async (sourceGraphUri, targetGraphUri) => {
        let remainingTripleCount = await this.getTripleCount(sourceGraphUri);
        while (remainingTripleCount > 0) {
            const moveBatchQuery = `DELETE { GRAPH <${sourceGraphUri}> { ?subject ?predicate ?object } }
                                     INSERT { GRAPH <${targetGraphUri}> { ?subject ?predicate ?object } }
                                     WHERE {
                                         {
                                             SELECT ?subject ?predicate ?object
                                             WHERE { GRAPH <${sourceGraphUri}> { ?subject ?predicate ?object } }
                                             LIMIT ${GRAPH_MOVE_BATCH_SIZE}
                                         }
                                     }`;
            await this.execQuery(moveBatchQuery);

            const remainingTripleCountAfterBatch = await this.getTripleCount(sourceGraphUri);
            if (remainingTripleCountAfterBatch >= remainingTripleCount) {
                throw new Error(`moveGraph made no progress: ${remainingTripleCountAfterBatch} triples still in <${sourceGraphUri}>`);
            }
            remainingTripleCount = remainingTripleCountAfterBatch;
        }
    };

    rewriteGraphResourceUris = async (graphUri, previousGraphUri, nextGraphUri) => {
        await this._rewriteGraphIriReferences(graphUri, previousGraphUri, nextGraphUri, "exact");

        const previousBaseUri = this._ensureTrailingSlash(previousGraphUri);
        const nextBaseUri = this._ensureTrailingSlash(nextGraphUri);
        await this._rewriteGraphIriReferences(graphUri, previousBaseUri, nextBaseUri, "prefix");
    };

    _ensureTrailingSlash = (uri) => {
        if (uri.endsWith("/") || uri.endsWith("#")) {
            return uri;
        }
        return `${uri}/`;
    };

    _getGraphIriReferenceCount = async (graphUri, previousIri, nextIri, matchMode) => {
        const iriFilter = this._buildIriRewriteFilter(previousIri, nextIri, matchMode);
        const query = `SELECT COUNT(*) as ?total
                       WHERE {
                           GRAPH <${graphUri}> {
                               ?subject ?predicate ?object .
                               FILTER(${iriFilter})
                           }
                       }`;
        const json = await this.execQuery(query);
        return Number(json[0]["total"]["value"]);
    };

    _rewriteGraphIriReferences = async (graphUri, previousIri, nextIri, matchMode) => {
        if (previousIri === nextIri) {
            return;
        }
        let remainingReferenceCount = await this._getGraphIriReferenceCount(graphUri, previousIri, nextIri, matchMode);
        while (remainingReferenceCount > 0) {
            const subjectExpression = this._buildRewrittenIriExpression("?subject", previousIri, nextIri, matchMode);
            const predicateExpression = this._buildRewrittenIriExpression("?predicate", previousIri, nextIri, matchMode);
            const objectExpression = this._buildRewrittenIriExpression("?object", previousIri, nextIri, matchMode);
            const iriFilter = this._buildIriRewriteFilter(previousIri, nextIri, matchMode);
            const rewriteBatchQuery = `DELETE { GRAPH <${graphUri}> { ?subject ?predicate ?object } }
                                       INSERT { GRAPH <${graphUri}> { ?rewrittenSubject ?rewrittenPredicate ?rewrittenObject } }
                                       WHERE {
                                           {
                                               SELECT ?subject ?predicate ?object
                                               WHERE {
                                                   GRAPH <${graphUri}> {
                                                       ?subject ?predicate ?object .
                                                       FILTER(${iriFilter})
                                                   }
                                               }
                                               LIMIT ${GRAPH_URI_REWRITE_BATCH_SIZE}
                                           }
                                           BIND(${subjectExpression} AS ?rewrittenSubject)
                                           BIND(${predicateExpression} AS ?rewrittenPredicate)
                                           BIND(${objectExpression} AS ?rewrittenObject)
                                       }`;
            await this.execQuery(rewriteBatchQuery);

            const remainingReferenceCountAfterBatch = await this._getGraphIriReferenceCount(graphUri, previousIri, nextIri, matchMode);
            if (remainingReferenceCountAfterBatch >= remainingReferenceCount) {
                throw new Error(`rewriteGraphResourceUris made no progress: ${remainingReferenceCountAfterBatch} references to <${previousIri}> still in <${graphUri}>`);
            }
            remainingReferenceCount = remainingReferenceCountAfterBatch;
        }
    };

    _buildIriRewriteFilter = (previousIri, nextIri, matchMode) => {
        const subjectCondition = this._buildIriMatchCondition("?subject", previousIri, nextIri, matchMode);
        const predicateCondition = this._buildIriMatchCondition("?predicate", previousIri, nextIri, matchMode);
        const objectCondition = this._buildIriMatchCondition("?object", previousIri, nextIri, matchMode);
        return `${subjectCondition} || ${predicateCondition} || ${objectCondition}`;
    };

    // Only guard against re-matching already-rewritten IRIs when nextIri is nested under previousIri
    // (e.g. moving a graph into a subfolder of its own URI: .../ -> .../test/). In that case, a
    // rewritten IRI still starts with previousIri and would be rewritten again on the next batch,
    // never converging. When nextIri is an ancestor of previousIri instead (.../ttest/ -> .../),
    // every original IRI already starts with nextIri too, so adding the exclusion would wrongly
    // match nothing at all.
    _buildIriMatchCondition = (variableName, previousIri, nextIri, matchMode) => {
        const previousIriLiteral = JSON.stringify(previousIri);
        if (matchMode === "exact") {
            return `(isIRI(${variableName}) && STR(${variableName}) = ${previousIriLiteral})`;
        }
        const isNextIriNestedUnderPreviousIri = nextIri.length > previousIri.length && nextIri.startsWith(previousIri);
        if (!isNextIriNestedUnderPreviousIri) {
            return `(isIRI(${variableName}) && STRSTARTS(STR(${variableName}), ${previousIriLiteral}))`;
        }
        const nextIriLiteral = JSON.stringify(nextIri);
        return `(isIRI(${variableName}) && STRSTARTS(STR(${variableName}), ${previousIriLiteral}) && !STRSTARTS(STR(${variableName}), ${nextIriLiteral}))`;
    };

    _buildRewrittenIriExpression = (variableName, previousIri, nextIri, matchMode) => {
        const iriMatchCondition = this._buildIriMatchCondition(variableName, previousIri, nextIri, matchMode);
        const nextIriLiteral = JSON.stringify(nextIri);
        if (matchMode === "exact") {
            return `IF(${iriMatchCondition}, IRI(${nextIriLiteral}), ${variableName})`;
        }
        const previousIriSuffixStart = previousIri.length + 1;
        return `IF(${iriMatchCondition}, IRI(CONCAT(${nextIriLiteral}, SUBSTR(STR(${variableName}), ${previousIriSuffixStart}))), ${variableName})`;
    };

    loadGraph = async (graphUri, graphPath) => {
        const query = `LOAD <${graphPath}> INTO GRAPH <${graphUri}>`;
        const json = await this.execQuery(query);
        return json;
    };

    /**
     * @param {string} graphUri - The Graph URI
     * @returns {Promise<any>} - response
     */
    deleteGraph = async (graphUri) => {
        if (this.endpointUser && this.endpointPassword) {
            await this._deleteGraphWithApi(graphUri);
        } else {
            await this._clearGraph(graphUri);
        }
    };
    /**
     * @param {string} graphUri - The Graph URI
     * @returns {Promise<any>} - response
     */
    _clearGraph = async (graphUri) => {
        const query = `CLEAR GRAPH <${graphUri}>`;
        const json = await this.execQuery(query);
        return json;
    };

    /**
     * @param {string} graphUri - The Graph URI
     * @returns {Promise<any>} - response
     */
    _deleteGraphWithApi = async (graphUri) => {
        const virtuosoUrl = this.endpointUrl.replace("/sparql", "");
        const urlParams = new URLSearchParams({
            graph: graphUri,
        });
        const url = new URL(`${virtuosoUrl}/sparql-graph-crud-auth?${urlParams.toString()}`).href;
        const client = new DigestClient(this.endpointUser, this.endpointPassword, { basic: false });
        const response = await client.fetch(url, { method: "DELETE" });
        await sleep(3); // give virtuoso little rest

        if (![200, 201, 404].includes(response.status)) {
            const message = await response.text();
            throw new Error(message);
        }
    };
}

const config = readMainConfig();

const rdfDataModel = new RdfDataModel(config.sparql_server.url, config.sparql_server.user, config.sparql_server.password);

export { RdfDataModel, rdfDataModel };
