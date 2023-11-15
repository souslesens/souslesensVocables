type Profile = {
    name: string;
    _type: string;
    id: string;
    allowedSourceSchemas: string[];
    allowedTools: string | string[];
    forbiddenTools: string[];
    defaultSourceAccessControl: string;
    sourcesAccessControl: {};
};

export { Profile };
