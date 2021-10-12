declare function getProfiles(url: string): Promise<Profile[]>;
declare type Blender = {
    contextMenuActionStartLevel: number;
};
declare type Profile = {
    name: string;
    allowedSourceSchemas: string[];
    allowedSources: string;
    forbiddenSources: string[];
    allowedTools: string;
    forbiddenTools: any[];
    blender: Blender;
};
export { getProfiles, Profile };
