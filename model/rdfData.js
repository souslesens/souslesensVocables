const { config } = require("./config");
const DigestClient = require("digest-fetch");

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
     * @returns {Promise<any>} json results
     */
    _query = async (query) => {
        const urlParams = new URLSearchParams({
            query: query,
            format: "application/sparql-results+json",
        });
        const url = new URL(`${this.endpointUrl}?${urlParams.toString()}`).href;
        let response;
        if (this.endpointUser && this.endpointPassword) {
            const client = new DigestClient(this.endpointUser, this.endpointPassword, { basic: false });
            response = await client.fetch(url);
        } else {
            response = await fetch(url);
        }

        const json = await response.json();
        const bindings = json["results"]["bindings"];
        return bindings;
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
}

const rdfDataModel = new RdfDataModel(config.sparql_server.url, config.sparql_server.user, config.sparql_server.password);

module.exports = { RdfDataModel, rdfDataModel };
