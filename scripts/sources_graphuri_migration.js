const fs = require("fs");
const path = require("path");
const yargs = require("yargs");

const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const configPath = argv.config;
const profilesFilePath = path.resolve(configPath + "/profiles.json");
const sourcesFilePath = path.resolve(configPath + "/sources.json");

fs.readFile(sourcesFilePath, (_err, sourcesRawData) => {
    const sourcesData = JSON.parse(sourcesRawData);
    // console.log(sourcesData);
    const newSourcesData = Object.fromEntries(
        Object.entries(sourcesData).map(([key, value]) => {
            let graphUri = value.graphUri;
            if (Array.isArray(value.graphUri)) {
                graphUri = value.graphUri[0];
            }
            if (typeof graphUri != "string") {
                // console.log(value.graphUri);
                graphUri = "";
            }
            value.graphUri = graphUri;
            let imports = value.imports;
            if (!imports) {
                imports = [];
            }
            if (typeof imports[0] != "string") {
                imports = [];
            }
            value.imports = imports;
            let topClassFilter = value.topClassFilter;
            if (!topClassFilter) {
                topClassFilter = "?topConcept rdf:type <http://www.w3.org/2002/07/owl#Class>";
            }
            value.topClassFilter = topClassFilter;

            try {
                if (typeof value.dataSource.local_dictionary === "undefined") {
                    value.dataSource.local_dictionary = null;
                }
            } catch {}

            // Handle empty arrays in sparql_server.headers
            const sparql_server = value.sparql_server;
            if (Array.isArray(sparql_server.headers)) {
                if (sparql_server.headers.length === 0) {
                    delete sparql_server.headers;
                } else {
                    throw new Error("Non-empty array found in sparql_server.headers");
                }
            }

            // Remove unused "type" property
            delete value["type"];

            return [key, value];
        })
    );
    if (argv.w) {
        // create a backup file
        const sourcesBackupFilePath = path.resolve(configPath + "/sources.json.bak");
        fs.cpSync(sourcesFilePath, sourcesBackupFilePath);
        fs.writeFileSync(sourcesFilePath, JSON.stringify(newSourcesData, null, 2));
    } else {
        // console.log(newSourcesData);
    }
});
