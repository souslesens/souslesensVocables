declare function getProfiles(url: string): Promise<string[]>;
declare type Profile = {
    name: string;
    allowedSourceSchemas: string[];
    allowedSources: string;
    forbiddenSources: string[];
    allowedTools: string[];
    forbiddenTools: string[];
};
export { getProfiles, Profile };
