
const { clearCache } = require("ejs");
const fs = require("fs")
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);



async function writeRessource(pathToRessource, newRessource, res) {
    try {
        const savedFile = await writeFile(pathToRessource, JSON.stringify(newRessource)).then(async () => await readFile(pathToRessource))
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
module.exports = { writeRessource, readRessource }