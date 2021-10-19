declare function getProfiles(url: string): Promise<Profile[]>;
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
export { getProfiles, Profile };
