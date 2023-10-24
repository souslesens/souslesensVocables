import { ulid } from "ulid";
import { Mode, Type, Msg_ } from "./Component/ProfilesTable";
import { failure, success } from "srd";
import { Msg } from "./Admin";
import React from "react";
import { z } from "zod";

type Response = { message: string; resources: ProfileJson[] };
const endpoint = "/api/v1/profiles";
async function getProfiles(): Promise<Profile[]> {
    const response = await fetch(endpoint);
    const json = (await response.json()) as Response;
    return mapProfiles(json.resources);
}

function mapProfiles(resources: ProfileJson[]) {
    const profiles: [string, ProfileJson][] = Object.entries(resources);
    const mapped_profiles = profiles
        .map(([key, val]) => {
            return decodeProfile(key, val);
        })
        .sort((profile1: Profile, profile2: Profile) => {
            const name1 = profile1.name.toUpperCase();
            const name2 = profile2.name.toUpperCase();
            if (name1 < name2) {
                return -1;
            }
            if (name1 > name2) {
                return 1;
            }
            return 0;
        });

    return mapped_profiles;
}

export async function saveProfile(body: Profile, mode: Mode, updateModel: React.Dispatch<Msg>, updateLocal: React.Dispatch<Msg_>) {
    try {
        let response = null;
        if (mode === Mode.Edition) {
            response = await fetch(endpoint + "/" + body.name, {
                method: "put",
                body: JSON.stringify(body, null, "\t"),
                headers: { "Content-Type": "application/json" },
            });
        } else {
            response = await fetch(endpoint, {
                method: "post",
                body: JSON.stringify({ [body.name]: body }, null, "\t"),
                headers: { "Content-Type": "application/json" },
            });
        }
        const { message, resources } = (await response.json()) as Response;
        if (response.status === 200) {
            if (mode === Mode.Edition) {
                const profiles = await getProfiles();
                updateModel({ type: "ServerRespondedWithProfiles", payload: success(mapProfiles(profiles)) });
            } else {
                updateModel({ type: "ServerRespondedWithProfiles", payload: success(mapProfiles(resources)) });
            }
            updateLocal({ type: Type.UserClickedModal, payload: false });
        } else {
            updateModel({ type: "ServerRespondedWithProfiles", payload: failure(`${response.status}, ${message}`) });
        }
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        updateModel({ type: "ServerRespondedWithProfiles", payload: failure(`Uncatched : ${e}`) });
    }
}
async function deleteProfile(profile: Profile, updateModel: React.Dispatch<Msg>) {
    try {
        const response = await fetch(`${endpoint}/${profile.name}`, { method: "delete" });
        const { message, resources } = (await response.json()) as Response;
        if (response.status === 200) {
            updateModel({ type: "ServerRespondedWithProfiles", payload: success(mapProfiles(resources)) });
        } else {
            updateModel({ type: "ServerRespondedWithProfiles", payload: failure(`${response.status}, ${message}`) });
        }
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        updateModel({ type: "ServerRespondedWithProfiles", payload: failure(`Uncatched Error : ${e}`) });
    }
}

type ProfileJson = {
    id?: string;
    name?: string;
    allowedSourceSchemas: string[];
    sourcesAccessControl: Record<string, SourceAccessControl>;
    allowedTools: string[] | string;
    forbiddenTools: string[];
    blender: Blender;
};

const decodeProfile = (key: string, profile: ProfileJson): Profile => {
    return {
        name: profile.name ? profile.name : key,
        _type: "profile",
        id: profile.id ? profile.id : ulid(),
        allowedSourceSchemas: profile.allowedSourceSchemas,
        sourcesAccessControl: profile.sourcesAccessControl,
        allowedTools: profile.allowedTools,
        forbiddenTools: profile.forbiddenTools,
        blender: { contextMenuActionStartLevel: profile.blender.contextMenuActionStartLevel },
    };
};

type Profile = z.infer<typeof ProfileSchema>;
const BlenderSchema = z.object({
    contextMenuActionStartLevel: z.coerce.number(),
});

const SourceAccessControlSchema = z.union([z.literal("forbidden"), z.literal("read"), z.literal("readwrite")]);

const ProfileSchema = {
    _type: z.string().optional(),
    id: z.string().default(ulid()),
    allowedSourceSchemas: z
        .array(z.string().nullish())
        .nullish()
        .transform((a) => (a ?? []).flatMap((item) => (item ? item : []))),
    sourcesAccessControl: z.record(SourceAccessControlSchema).default({}),
    allowedTools: z.union([z.string(), z.array(z.string())]).default("ALL"),
    forbiddenTools: z.array(z.string()).default([]),
    blender: BlenderSchema.default({ contextMenuActionStartLevel: 0 }),
};

export const ProfileSchemaCreate = {
    ...ProfileSchema,
    name: z
        .string()
        .refine((val) => val !== "admin", { message: "Name can't be admin" })
        .refine((val) => val.match(/^[a-z0-9][a-z0-9-_]{1,253}$/i), { message: "Name can only contain alphanum and - or _ chars" }),
};

export const profileHelp = {
    name: "The profile name, Cannot be admin and can only contain alphanum, - or _",
    blenderLevel: "Blender level is…",
    allowedSourceSchema: "The allowed source shema is…",
    allowedTools: "Tools that are allowed to the profile. If `Allow all tools` is checked, all tools are allowed. otherwise, only tools that are seleced are allowed.",
    forbiddenTools: "List of tools that are forbidden. The final list of allowed tools are the list of allowed tools without the list of forbidden tools.",
    sourcesAccessControl: "Define access control (forbidden, read or readwrite) for each sources group",
};

type Blender = z.infer<typeof BlenderSchema>;

type SourceAccessControl = z.infer<typeof SourceAccessControlSchema>;

export const defaultProfile = (uuid: string): Profile => {
    return {
        name: "",
        _type: "profile",
        id: uuid,
        allowedSourceSchemas: [],
        sourcesAccessControl: {},
        allowedTools: "ALL",
        forbiddenTools: [],
        blender: { contextMenuActionStartLevel: 0 },
    };
};
export { getProfiles, deleteProfile, Profile, SourceAccessControl, ProfileSchema };
