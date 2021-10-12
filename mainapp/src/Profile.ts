

async function getProfiles(url: string): Promise<string[]> {

    const response = await fetch(url);
    const json = await response.json();
    const roles = Object.keys(json);


    return roles
}

type Profile = {
    name: string,
    allowedSourceSchemas: string[],
    allowedSources: string,
    forbiddenSources: string[],
    allowedTools: string[],
    forbiddenTools: string[]
}
const test = {
    "admin": {
        "allowedSourceSchemas": [
            "SKOS",
            "OWL",
            "INDIVIDUALS"
        ],
        "allowedSources": "ALL",
        "forbiddenSources": [
            "Dbpedia"
        ],
        "allowedTools": "ALL",
        "forbiddenTools": [],
        "blender": {
            "contextMenuActionStartLevel": 0
        }
    }
}

export { getProfiles, Profile }