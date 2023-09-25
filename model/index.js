const { config } = require("./config");
const { Client: Client7 } = require("es7");

class IndexModel {
    /**
     * @param {string} elasticsearchUrl - url of elasticsearch
     * @param {string} elasticsearchUser - user of elasticsearch
     * @param {string} elasticsearchPassword - password of elasticsearch
     * @param {string} elasticsearchCaFingerprint - Fingerprint of certificate
     */
    constructor(elasticsearchUrl, elasticsearchUser, elasticsearchPassword, elasticsearchCaFingerprint) {
        this.elasticsearchUrl = elasticsearchUrl;
        this.elasticsearchUser = elasticsearchUser;
        this.elasticsearchPassword = elasticsearchPassword;
        this.elasticsearchCaFingerprint = elasticsearchCaFingerprint;
    }

    getIndices = async () => {
        let connInfo = { node: this.elasticsearchUrl };
        if (this.elasticsearchUser && this.elasticsearchPassword) {
            const auth = { username: this.elasticsearchUser, password: this.elasticsearchPassword };
            if (this.elasticsearchUrl.startsWith("https") && this.elasticsearchCaFingerprint) {
                const tls = { rejectUnauthorized: false };
                const caFingerprint = this.elasticsearchCaFingerprint;
                connInfo = { ...connInfo, ssl: tls, caFingerprint: caFingerprint };
            }
            connInfo = { ...connInfo, auth: auth };
        }
        const client = new Client7(connInfo);
        const indices = await client.cat.indices({ format: "json" });
        const indexNames = indices.body
            .map((index) => {
                return index.index;
            })
            .filter((index) => {
                if (!index.startsWith(".")) {
                    return index;
                }
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

const indexModel = new IndexModel(config.ElasticSearch.url, config.ElasticSearch.user, config.ElasticSearch.password, config.ElasticSearch.caFingerprint);

module.exports = { IndexModel, indexModel };
