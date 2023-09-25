async function getConfig(): Promise<Config> {
    const response = await fetch("/api/v1/config");
    const json = (await response.json()) as Config;
    return json;
}

export type Config = {
    auth: string;
    tools_available: string[];
};

export { getConfig };
