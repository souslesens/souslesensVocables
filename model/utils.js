const knex = require("knex");

const RDF_FORMATS_MIMETYPES = {
    json: "application/sparql-results+json",
    nt: "text/plain",
    ttl: "text/turtle",
    csv: "text/csv",
    tsv: "text/tab-separated-values",
    xml: "application/rdf+xml",
};

/**
 * Recall a function if it fail.
 *
 * @param {function} func - The function to redo if it fail
 * @param {number} maxRedo - number of try before raise the error
 * @param {number} sleepTime - number of second to wait between each try.
 * @param {object} args - other parameters to pass to the func
 * @returns {Any} - Return of the func
 */
const redoIfFailure = async (func, maxRedo = 10, sleepTime = 10, ...args) => {
    let i = 0;
    let newSleepTime = sleepTime;
    while (true) {
        i += 1;
        try {
            return await func(...args);
        } catch (e) {
            if (i >= maxRedo) {
                throw e;
            }
            console.warn(e);
            console.warn(`Fail to execute ${func.name}. Retrying in ${newSleepTime} secs…`);
            await sleep(newSleepTime);
            newSleepTime = newSleepTime * 2;
            continue;
        }
    }
};

/**
 * Wait
 *
 * @param {number} sec - the number of seconds to wait
 * @returns {Any}
 */
const sleep = (sec) => {
    new Promise((r) => setTimeout(r, sec * 60));
};

/**
 * Convert a string to a valid JavaScript type
 *
 * @param {string} value – The value to convert
 * @param {boolean} trimValue – Remove the whitespaces from the edge of string
 * @returns {Any}
 */
const convertType = (value, trimValue = true) => {
    if (typeof value !== "string") {
        // No need to convert this value
        return value;
    }

    if (trimValue) {
        value = value.trim();
    }

    if (value.search(/^(true|false)$/) > -1) {
        return value === "true" ? true : false;
    }

    if (value.search(/^(\+|-)?[0-9]+$/) > -1) {
        return parseInt(value);
    }

    if (value.search(/^(\+|-)?[0-9]+(\.[0-9]*)?([eE](\+|-)?[0-9]+)?$/) > -1) {
        return parseFloat(value);
    }

    return value;
};

/**
 * Chunk a list into list of sublists
 *
 * @param {any[]} list – an array of elements
 * @param {number} chunkSize – length of chunks
 * @returns {any[][]}
 */
const chunk = (list, chunkSize = 10) => {
    if (chunkSize <= 0) {
        return [list];
    }
    return [...Array(Math.ceil(list.length / chunkSize))].map((_) => list.splice(0, chunkSize));
};

/**
 * Retrieve the Postgres connection from the configuration information
 *
 * @param {object} database – The information relative to the database used to
 *                            made the connection
 * @returns {knex} - the knex connection instance configure to use Postgres
 */
const getKnexConnection = (database) => {
    return knex({ client: "pg", connection: database });
};

/**
 * Close the connection to the Postgres database
 *
 * This method is here to be mocked easily with the jest tests
 *
 * @param {knex} connection - the instance of the connection to the Postgres database
 */
const cleanupConnection = (connection) => {
    return connection.destroy && connection.destroy();
};

module.exports = { cleanupConnection, convertType, chunk, getKnexConnection, redoIfFailure, RDF_FORMATS_MIMETYPES };
