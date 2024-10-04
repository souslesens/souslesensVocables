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

    if (value.search(/^(\+|\-)?[0-9]+$/) > -1) {
        return parseInt(value);
    }

    if (value.search(/^(\+|\-)?[0-9]+(\.[0-9]*)?([eE](\+|\-)?[0-9]+)?$/) > -1) {
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

module.exports = { convertType, chunk };
