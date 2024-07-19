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

module.exports = { convertType };
