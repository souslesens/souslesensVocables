const fs = require("fs");
const util = require("util");
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const path = require("path");
const sanitizePath = (/** @type {string} */ user_input) => {
    if (user_input.indexOf("\0") !== -1) {
        throw Error("Bad Input");
    }
    if (!/^[-_/A-Za-z0-9]+$/.test(user_input)) {
        throw Error("Bad Input");
    }
    const safe_input = path.normalize(user_input).replace(/^(\.\.(\/|\\|$))+/, "");
    return safe_input;
};

async function writeResource(pathToResource, newResource, _res) {
    try {
        const savedFile = await writeFile(pathToResource, JSON.stringify(newResource, null, 2)).then(async () => await readFile(pathToResource));
        return JSON.parse(savedFile);
    } catch (error) {
        throw "ERROR WHEN SAVING";
    }
}

async function readResource(pathToResource, _res) {
    try {
        const file = await readFile(pathToResource);
        return JSON.parse(file);
    } catch (e) {
        throw `ERROR: ${e}`;
    }
}
function success(res, updatedResources, msg) {
    res.status(200).json({
        message: msg,
        resources: updatedResources,
    });
}
function resourceCreated(res, updatedResources) {
    success(res, updatedResources, "resource successfully created");
}
function resourceUpdated(res, updatedResources) {
    success(res, updatedResources, "resource successfully updated");
}
function resourceDeleted(res, updatedResources) {
    success(res, updatedResources, "resource successfully deleted");
}
function resourceFetched(res, updatedResources) {
    success(res, updatedResources, "resources successfully fetched");
}

const successfullyCreated = (resource) => {
    return { message: "resource successfully created", resources: resource };
};
const successfullyUpdated = (resource) => {
    return { message: "resource successfully updated", resources: resource };
};
const successfullyDeleted = (resource) => {
    return { message: "resource successfully deleted", resources: resource };
};
const successfullyFetched = (resource) => {
    return { message: "resource successfully fetched", resources: resource };
};

function failure(res, code, errMsg) {
    switch (code) {
        case 400:
            res.status(code).json({ message: `Something is wrong with this request: ${errMsg}` });
            break;
        default:
            res.status(500).json({ message: `Something went wrong internally: ${errMsg}` });
    }
}

function verbToHuman(verb) {
    switch (verb) {
        case "GET":
            return "fetched";
        case "PUT":
            return "updated";
        case "POST":
            return "created";
        case "DELETE":
            return "deleted";
        default:
            return "unkown verb";
    }
}

function responseSchema(resourceName, verb) {
    return {
        200: {
            description: `${resourceName} successfully ${verbToHuman(verb)}`,
            schema: {
                properties: {
                    message: { type: "string" },
                    resources: {
                        type: "object",
                        $ref: `#/definitions/${resourceName}`,
                    },
                },
            },
        },

        default: {
            description: "An error occurred",
            schema: {
                additionalProperties: true,
            },
        },
    };
}

// XXX Is it really useful in all cases ?
function processResponse(response, error, result) {
    if (response && !response.finished) {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE"); // If needed
        response.setHeader("Access-Control-Allow-Headers", "X-Requested-With,contenttype"); // If needed
        response.setHeader("Access-Control-Allow-Credentials", true); // If needed*/

        if (error) {
            if (typeof error == "object") {
                if (error.message) error = error.message;
                else error = JSON.stringify(error, null, 2);
            }
            console.log("ERROR !!" + error);
            response.status(404).send({ ERROR: error });
        } else if (!result) {
            response.send({ done: true });
        } else if (typeof result == "string") {
            response.send(JSON.stringify({ result: result }));
        } else if (result.contentType && result.data) {
            response.setHeader("Content-type", result.contentType);
            if (typeof result.data == "object") response.send(JSON.stringify(result.data));
            else response.send(result.data);
        } else {
            response.setHeader("Content-type", "application/json");
            response.send(result);
        }
    }
}

module.exports = {
    writeResource,
    failure,
    responseSchema,
    resourceFetched,
    readResource,
    resourceCreated,
    resourceUpdated,
    resourceDeleted,
    successfullyCreated,
    successfullyUpdated,
    successfullyDeleted,
    successfullyFetched,
    processResponse,
    sanitizePath,
};
