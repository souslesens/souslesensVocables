import { ulid } from "ulid";
import { Mode, Type, Msg_ } from "./Component/ProfilesTable";
import { failure, success } from "srd";
import { Msg } from "./Admin";
import React from "react";
import { z } from "zod";

type Response = { message: string; resources: ProfileJson[] };
const endpoint = "/api/v1/admin/profiles";
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
                updateModel({ type: "profiles", payload: success(mapProfiles(profiles)) });
            } else {
                updateModel({ type: "profiles", payload: success(mapProfiles(resources)) });
            }
            updateLocal({ type: Type.UserClickedModal, payload: false });
        } else {
            updateModel({ type: "profiles", payload: failure(`${response.status}, ${message}`) });
        }
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        updateModel({ type: "profiles", payload: failure(`Uncatched : ${e}`) });
    }
}
async function deleteProfile(profile: Profile, updateModel: React.Dispatch<Msg>) {
    try {
        const response = await fetch(`${endpoint}/${profile.name}`, { method: "delete" });
        const { message, resources } = (await response.json()) as Response;
        if (response.status === 200) {
            updateModel({ type: "profiles", payload: success(mapProfiles(resources)) });
        } else {
            updateModel({ type: "profiles", payload: failure(`${response.status}, ${message}`) });
        }
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        updateModel({ type: "profiles", payload: failure(`Uncatched Error : ${e}`) });
    }
}

type ProfileJson = {
    id?: string;
    name: string;
    allowedSourceSchemas: string[];
    sourcesAccessControl: Record<string, SourceAccessControl>;
    allowedTools: string[];
    allowedDatabases: string[];
    isShared: boolean;
    theme?: string;
};

const decodeProfile = (key: string, profile: ProfileJson): Profile => {
    return {
        name: profile.name ? profile.name : key,
        _type: "profile",
        id: profile.id ? profile.id : ulid(),
        allowedSourceSchemas: profile.allowedSourceSchemas,
        sourcesAccessControl: profile.sourcesAccessControl,
        allowedTools: profile.allowedTools,
        allowedDatabases: profile.allowedDatabases,
        isShared: profile.isShared,
        theme: profile.theme,
    };
};

export type Profile = z.infer<typeof ProfileSchema>;

const SourceAccessControlSchema = z.union([z.literal("forbidden"), z.literal("read"), z.literal("readwrite")]);

const ProfileSchema = z.object({
    name: z.string().default(""),
    _type: z.string().optional(),
    theme: z.string().optional(),
    allowedSourceSchemas: z
        .array(z.string().nullish())
        .nullish()
        .transform((a) => (a ?? []).flatMap((item) => (item ? item : []))),
    sourcesAccessControl: z.record(SourceAccessControlSchema).default({}),
    allowedTools: z.array(z.string()).default([]),
    allowedDatabases: z.array(z.string()).default([]),
    isShared: z.boolean().default(true),
    id: z.string().default(ulid()),
});

export const ProfileSchemaCreate = ProfileSchema.merge(
    z.object({
        name: z
            .string()
            .refine((val) => val !== "admin", { message: "Name can't be admin" })
            .refine((val) => val.match(/^[a-z0-9][a-z0-9-_]{1,253}$/i), { message: "Name can only contain alphanum and - or _ chars" }),
    }),
);

export type SourceAccessControl = z.infer<typeof SourceAccessControlSchema>;

export const defaultProfile = (uuid: string): Profile => {
    return {
        name: "",
        _type: "profile",
        id: uuid,
        allowedSourceSchemas: [],
        sourcesAccessControl: {},
        allowedTools: [],
        allowedDatabases: [],
        isShared: true,
        theme: "",
    };
};
export { getProfiles, deleteProfile, ProfileSchema };
