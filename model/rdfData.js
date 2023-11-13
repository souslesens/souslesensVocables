const { config } = require("./config");
const DigestClient = require("digest-fetch");
const rdf = require("rdflib");

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
     * @param {boolean} jsonOutput - JSON output format (false = nt)
     * @returns {Promise<any>} json results
     */
    _query = async (query, jsonOutput = true) => {
        const urlParams = new URLSearchParams({
            query: query,
            format: jsonOutput ? "application/sparql-results+json" : "text/plain",
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
        if (jsonOutput) {
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
        const json = await this._query(query);
        const graphs = json.map((r) => {
            return r.graph.value;
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
            if (!graphsToExclude.includes(g)) {
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
        const json = await this._query(query);
        return Number(json[0]["total"]["value"]);
    };

    /**
     * @param {string} graphUri - the graph URI
     * @returns {Promise<number>} - number of triples per page
     */
    getPageSize = async (graphUri) => {
        const query = `SELECT *
                       FROM <${graphUri}>
                       WHERE { ?s ?p ?o . }`;
        const json = await this._query(query);
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
        const json = await this._query(query, jsonOutput);
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
        const json = await this._query(query, true);
        return json;
    };
}

const rdfDataModel = new RdfDataModel(config.sparql_server.url, config.sparql_server.user, config.sparql_server.password);

module.exports = { RdfDataModel, rdfDataModel };
