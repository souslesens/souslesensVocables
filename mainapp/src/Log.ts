type Log = { user: string; tool: string; source: string; timestamp: string };

const endpoint = "/api/v1/logs";
async function getLogFiles(): Promise<Log[]> {
    const response = await fetch(endpoint);
    const json = (await response.json()) as Log[];
    return json;
}
async function getLogs(file): Promise<Log[]> {
    const response = await fetch(endpoint + "/" + file);
    const json = (await response.json()) as Log[];
    return json;
}

export { Log, getLogFiles, getLogs };
