
const { clearCache } = require("ejs");
const fs = require("fs")
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);



async function writeRessource(pathToRessource, newRessource, res) {
    try {
        const savedFile = await writeFile(pathToRessource, JSON.stringify(newRessource, null, 2)).then(async () => await readFile(pathToRessource))
        return (JSON.parse(savedFile))
    }
    catch (error) {
        throw "ERROR WHEN SAVING"

    }
}

async function readRessource(pathToRessource, res) {
    try {
        const file = await readFile(pathToRessource)
        return (JSON.parse(file))
    }
    catch (e) { throw `ERROR: ${e}` }

}
function success(res, updatedRessources, msg) {
    res.status(200).json({
        message: msg,
        ressources: updatedRessources
    });
}
function ressourceCreated(res, updatedRessources) {
    success(res, updatedRessources, 'ressource successfully created')
}
function ressourceUpdated(res, updatedRessources) {
    success(res, updatedRessources, 'ressource successfully updated')
}
function ressourceDeleted(res, updatedRessources) {
    success(res, updatedRessources, 'ressource successfully deleted')
}
function ressourceFetched(res, updatedRessources) {
    success(res, updatedRessources, 'ressources successfully fetched')
}

function failure(res, code, errMsg) {
    switch (code) {
        case 400:
            res.status(code).json({ message: `Something is wrong with this request: ${errMsg}` })
            break;
        default:
            res.status(500).json({ message: `Something went wrong internally: ${errMsg}` })
    }
}

module.exports = { writeRessource, failure, ressourceFetched, readRessource, ressourceCreated, ressourceUpdated, ressourceDeleted }