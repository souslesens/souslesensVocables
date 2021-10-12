import { ulid } from "ulid";


async function getProfiles(url: string): Promise<Profile[]> {

    const response = await fetch(url);
    const json = await response.json();
    const entries: [string, ProfileJson][] = Object.entries(json)
    const decodedEntries = entries.map(([key, val]) => decodeProfile(key, val))


    return decodedEntries
}


type ProfileJson = {
    allowedSourceSchemas: string[];
    allowedSources: string;
    forbiddenSources: string[];
    allowedTools: string;
    forbiddenTools: any[];
    blender: Blender;
}

type Blender = {
    contextMenuActionStartLevel: number;
}


const decodeProfile = (name: string, profile: ProfileJson): Profile => {
    return {
        name: name,
        allowedSourceSchemas: profile.allowedSourceSchemas,
        allowedSources: profile.allowedSources,
        forbiddenSources: profile.forbiddenSources,
        allowedTools: profile.allowedTools,
        forbiddenTools: profile.forbiddenTools,
        blender: { contextMenuActionStartLevel: profile.blender.contextMenuActionStartLevel }
    }
}

type Profile = {
    name: string,
    allowedSourceSchemas: string[];
    allowedSources: string;
    forbiddenSources: string[];
    allowedTools: string;
    forbiddenTools: any[];
    blender: Blender;
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