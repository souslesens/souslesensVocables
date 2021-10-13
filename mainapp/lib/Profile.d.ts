declare function getProfiles(url: string): Promise<Profile[]>;
export declare function putProfiles(body: Profile[]): Promise<Profile[]>;
declare type Blender = {
    contextMenuActionStartLevel: number;
};
declare type Profile = {
    name: string;
    allowedSourceSchemas: string[];
    allowedSources: string;
    forbiddenSources: string[];
    allowedTools: string;
    forbiddenTools: string[];
    blender: Blender;
};
export declare const defaultProfile: Profile;
export { getProfiles, Profile };
