const { readMainConfig } = require("./config");
const DigestClient = require("digest-fetch");
const fetch = require("node-fetch");
const { RDF_FORMATS_MIMETYPES } = require("./utils");
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
     * @returns {Promise<number>} - number of triples
     */
    getTripleCount = async (graphUri) => {
        const query = `SELECT COUNT(*) as ?total
                       FROM <${graphUri}>
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
     * @returns {Promise<any>} - the RDF data
     */
    getGraphPart = async (graphUri, limit, offset, jsonOutput) => {
        const query = `CONSTRUCT { ?s ?p ?o .}
                       FROM <${graphUri}>
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
     * @returns {Promise<any>} - the RDF data
     */
    getGraphPartNt = async (graphUri, limit, offset) => {
        return await this.getGraphPart(graphUri, limit, offset, false);
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
    clearGraph = async (graphUri) => {
        const query = `CLEAR GRAPH <${graphUri}>`;
        const json = await this.execQuery(query);
        return json;
    };
}

const config = readMainConfig();

const rdfDataModel = new RdfDataModel(config.sparql_server.url, config.sparql_server.user, config.sparql_server.password);

module.exports = { RdfDataModel, rdfDataModel };
