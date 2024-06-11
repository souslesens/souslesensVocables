type Log = { user: string; tool: string; source: string; action: string; timestamp: string };

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

async function writeLog(user: string, tool: string, action: string, source: string): number {
    const body = { infos: `${user},${tool},${source},${action}` };

    const response = await fetch(endpoint, {
        method: "post",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
    });
    await response.json();

    return response.status;
}

export { Log, getLogFiles, getLogs, writeLog };
