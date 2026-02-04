import { readMainConfig } from "./config.js";
import DigestClient from "digest-fetch";
import fetch from "node-fetch";
import { RDF_FORMATS_MIMETYPES, sleep } from "./utils.js";
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
     * @param {string} graphUri - The Graph URI
     * @param {string} graphPath - URL of data
     * @returns {Promise<any>} - response
     */
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
            this._deleteGraphWithApi(graphUri);
        } else {
            this._clearGraph(graphUri);
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
