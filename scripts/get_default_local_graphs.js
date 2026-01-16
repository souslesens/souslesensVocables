import fs from "fs";

const sourcesTemplatePath = "config_templates/sources.json.default";
fs.readFile(sourcesTemplatePath, (_err, data) => {
    const sources = JSON.parse(data);
    const sourcesList = Object.entries(sources);
    const graphList = sourcesList
        .filter(([_name, source]) => {
            if (source.sparql_server.url === "_default") {
                return [_name, source];
            }
        })
        .forEach(([name, source]) => {
            console.log(source.graphUri);
        });
});
