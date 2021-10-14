import { ulid } from "ulid";


async function getProfiles(url: string): Promise<Profile[]> {

    const response = await fetch(url);
    const json = await response.json();
    const entries: [string, ProfileJson][] = Object.entries(json)
    const decodedEntries = entries.map(([key, val]) => decodeProfile(key, val))


    return decodedEntries
}

export async function putProfiles(body: Profile[]): Promise<Profile[]> {

    const usersToObject = body.reduce((obj, item) => ({ ...obj, [item.name]: item }), {});
    const response = await fetch("/profiles", { method: "put", body: JSON.stringify(usersToObject, null, '\t'), headers: { 'Content-Type': 'application/json' } });
    const json = await response.json();
    const entries: [string, ProfileJson][] = Object.entries(json);
    const decodedEntries = entries.map(([key, val]) => decodeProfile(key, val))

    return decodedEntries
}

type ProfileJson = {
    id?: string,
    allowedSourceSchemas: string[];
    allowedSources: string;
    forbiddenSources: string[];
    allowedTools: string;
    forbiddenTools: string[];
    blender: Blender;
}

type Blender = {
    contextMenuActionStartLevel: number;
}


const decodeProfile = (name: string, profile: ProfileJson): Profile => {
    return {
        name: name,
        id: profile.id ? profile.id : ulid(),
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
    id: string,
    allowedSourceSchemas: string[];
    allowedSources: string;
    forbiddenSources: string[];
    allowedTools: string;
    forbiddenTools: string[];
    blender: Blender;
}


export const defaultProfile: Profile = {
    name: "",
    id: ulid(),
    allowedSourceSchemas: [],
    allowedSources: "",
    forbiddenSources: [],
    allowedTools: "",
    forbiddenTools: [],
    blender: { contextMenuActionStartLevel: 0 }
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