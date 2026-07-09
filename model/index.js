import { readMainConfig } from "./config.js";
import { Client } from "@elastic/elasticsearch";
import { chunk } from "./utils.js";

class IndexModel {
    /**
     * @param {string} elasticsearchUrl - url of elasticsearch
     * @param {string} elasticsearchUser - user of elasticsearch
     * @param {string} elasticsearchPassword - password of elasticsearch
     * @param {boolean} elasticsearchSkipSslVerify - skip ssl check
     */
    constructor(elasticsearchUrl, elasticsearchUser, elasticsearchPassword, elasticsearchSkipSslVerify, searchChunkSize) {
        this.elasticsearchUrl = elasticsearchUrl;
        this.elasticsearchUser = elasticsearchUser;
        this.elasticsearchPassword = elasticsearchPassword;
        this.skipSslVerify = elasticsearchSkipSslVerify;
        this.searchChunkSize = searchChunkSize;
    }

    getClient = () => {
        if (this.skipSslVerify) {
            process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
        }
        let connInfo = {
            node: this.elasticsearchUrl,
            tls: { rejectUnauthorized: !this.skipSslVerify },
        };
        if (this.elasticsearchUser && this.elasticsearchPassword) {
            connInfo = {
                ...connInfo,
                auth: {
                    username: this.elasticsearchUser,
                    password: this.elasticsearchPassword,
                },
            };
        }
        const client = new Client(connInfo);
        return client;
    };

    getIndices = async () => {
        const client = this.getClient();
        const indices = await client.cat.indices({ format: "json" });
        const indexNames = indices
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

    searchTerm = async (indices, uris) => {
        const client = this.getClient();
        const chunkedIndices = chunk(indices, this.searchChunkSize);

        let allHits = [];
        for (const i in chunkedIndices) {
            const chunk = chunkedIndices[i];
            const payload = {
                index: chunk,
                query: {
                    terms: {
                        "id.keyword": uris,
                    },
                },
                from: 0,
                size: 1000,
                _source: {
                    excludes: ["attachment.content", "parents"],
                },
            };
            const results = await client.search(payload);
            const hits = results.hits.hits;
            hits.forEach((hit) => {
                allHits.push(hit);
            });
        }
        return allHits;
    };

    /**
     * @param {string[]} indices - array of index to delete
     */
    deleteIndices = async (indices) => {
        const client = this.getClient();
        for (const index of indices) {
            await client.indices.delete({ index: index });
        }
    };
}

const config = readMainConfig();
const indexModel = new IndexModel(config.ElasticSearch.url, config.ElasticSearch.user, config.ElasticSearch.password, config.ElasticSearch.skipSslVerify, config.ElasticSearch.searchChunkSize || 20);

export { IndexModel, indexModel };
