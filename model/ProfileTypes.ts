type Profile = {
    name: string;
    _type: string;
    id: string;
    allowedSourceSchemas: string[];
    allowedTools: string[];
    defaultSourceAccessControl: string;
    sourcesAccessControl: {};
    theme: string;
};

export { Profile };
