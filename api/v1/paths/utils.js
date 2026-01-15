import fs from 'fs';
import util from 'util';
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
import path from 'path';
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
    } catch (e) {
        throw `ERROR WHEN SAVING: ${e}`;
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
            response.status(500).send({ ERROR: error });
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

function filterSources(allowedSources, sources) {
    return Object.fromEntries(
        Object.entries(sources).filter(([sourceId, source]) => {
            if (sourceId in allowedSources) {
                source["accessControl"] = allowedSources[sourceId];
                return [sourceId, source];
            }
        }),
    );
}

function getAllowedSources(user, profiles, sources, formalOntologySourceLabel) {
    const aProfiles = Object.entries(profiles);
    const aSources = Object.entries(sources);
    const userProfiles = aProfiles.filter(([profileName, profile]) => {
        if (user.groups.includes(profileName)) {
            return [profileName, profile];
        }
    });
    // for all profile
    const allAccessControl = userProfiles.flatMap(([_k, profile]) => {
        const sourcesAccessControl = profile.sourcesAccessControl;
        const allowedSourceSchemas = profile.allowedSourceSchemas;
        // browse all sources, filter allowedSourceSchemas and get accessControl
        return aSources
            .filter(([sourceName, source]) => {
                if (allowedSourceSchemas.includes(source.schemaType)) {
                    return [sourceName, source];
                }
            })
            .map(([sourceName, source]) => {
                const schemaType = source.schemaType;
                const group = source.group;
                const treeStr = [schemaType, group, sourceName].join("/");
                // find the closest parent accessControl
                const closestParent = Object.entries(sourcesAccessControl)
                    .filter(([k, v]) => {
                        if (treeStr === k || treeStr.startsWith(`${k}/`)) {
                            return [k, v];
                        }
                    })
                    .reduce((acc, current) => (acc[0].length >= current[0].length ? acc : current), ["", ""]);
                return [sourceName, closestParent[1]];
            });
    });

    // get all read or readwrite source
    const allowedSources = allAccessControl
        .filter(([sourceName, accessControl]) => {
            if (["read", "readwrite"].includes(accessControl)) {
                return sourceName;
            }
        })
        .concat([[formalOntologySourceLabel, "read"]]);

    // sort and uniq. If a source have read and readwrite, keep readwrite
    // to keep readwrite, sort read first. fromEntries will keep the last
    const sortedAndReducedAllowedSources = allowedSources
        .sort((s1, s2) => {
            if (s1[0] < s2[0]) {
                return -1;
            }
            if (s1[0] > s2[0]) {
                return 1;
            }
            return 0;
        })
        .sort((s1, s2) => {
            if (s1[1] < s2[1]) {
                return -1;
            }
            if (s1[1] > s2[1]) {
                return 1;
            }
            return 0;
        });
    return Object.fromEntries(sortedAndReducedAllowedSources);
}

function sortObjectByKey(obj) {
    const objList = Object.entries(obj);
    const sortedObjList = objList.sort((a, b) => {
        return a[0].localeCompare(b[0]);
    });
    const sortedObj = Object.fromEntries(sortedObjList);
    return sortedObj;
}

//manage boolean transformed in strings by jquery
function fixBooleanInObject(obj, depth) {
    if (!depth) depth = 0;
    else {
        if (depth++ > 20) return obj;
    }
    if (typeof obj === "object") {
        for (var key in obj) {
            if (obj[key] == "false") obj[key] = false;
            if (obj[key] == "true") obj[key] = true;
            else {
                fixBooleanInObject(obj[key], depth + 1);
            }
        }
    }
    return obj;
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
    getAllowedSources,
    filterSources,
    sortObjectByKey,
    fixBooleanInObject,
};
