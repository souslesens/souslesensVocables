type Log = { user: string; tool: string; timestamp: string };

const endpoint = "/api/v1/logs";
async function getLogs(): Promise<Log[]> {
    const response = await fetch(endpoint);
    const json = await response.json();
    return json;
}

export { Log, getLogs };
