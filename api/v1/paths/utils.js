const fs = require("fs");
const util = require("util");
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

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
};
