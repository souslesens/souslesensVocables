const { config } = require("./config");
const { Client: Client7 } = require("es7");

class IndexModel {
    /**
     * @param {string} elasticsearchUrl - url of elasticsearch
     * @param {string} elasticsearchUser - user of elasticsearch
     * @param {string} elasticsearchPassword - password of elasticsearch
     */
    constructor(elasticsearchUrl, elasticsearchUser, elasticsearchPassword) {
        this.elasticsearchUrl = elasticsearchUrl;
        this.elasticsearchUser = elasticsearchUser;
        this.elasticsearchPassword = elasticsearchPassword;
    }

    getIndices = async () => {
        let connInfo = { node: this.elasticsearchUrl };
        if (this.elasticsearchUser && this.elasticsearchPassword) {
            const auth = { username: this.elasticsearchUser, password: this.elasticsearchPassword };
            connInfo = { ...connInfo, auth: auth };
        }
        const client = new Client7(connInfo);
        const indices = await client.cat.indices({ format: "json" });
        const indexNames = indices.body.map((index) => {
            return index.index;
        });
        return indexNames;
    };

    /**
     * @param {string[]} indices - array of index to delete
     */
    deleteIndices = async (indices) => {
        const client = new Client7({ node: this.elasticsearchUrl });
        for (const index of indices) {
            await client.indices.delete({ index: index });
        }
    };
}

const indexModel = new IndexModel(config.ElasticSearch.url, config.ElasticSearch.user, config.ElasticSearch.password);

module.exports = { IndexModel, indexModel };
