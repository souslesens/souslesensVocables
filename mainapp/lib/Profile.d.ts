import { Mode, Msg_ } from "./Component/ProfilesTable";
import { Msg } from './Admin';
import React from 'react';
declare function getProfiles(url: string): Promise<Profile[]>;
export declare function saveProfile(body: Profile, mode: Mode, updateModel: React.Dispatch<Msg>, updateLocal: React.Dispatch<Msg_>): Promise<void>;
declare function deleteProfile(profile: Profile, updateModel: React.Dispatch<Msg>): Promise<void>;
export declare function putProfiles(body: Profile[]): Promise<Profile[]>;
declare type Blender = {
    contextMenuActionStartLevel: number;
};
declare type Profile = {
    name: string;
    _type: string;
    id: string;
    allowedSourceSchemas: string[];
    allowedSources: string | string[];
    forbiddenSources: string | string[];
    allowedTools: string | string[];
    forbiddenTools: string[];
    blender: Blender;
};
export declare const defaultProfile: (uuid: string) => Profile;
export { getProfiles, deleteProfile, Profile };
