const sample = [{
    "user": "xgarnier",
    "tool": "Lineage",
    "timestamp": "2021-11-29 12:20:21"

}]

type Log = { user: string, tool: string, timestamp: string }

const endpoint = "/api/v1/logs";
async function getLogs(): Promise<Log[]> {

    const response = await fetch(endpoint);
    const json = await response.json();
    return json
}



export { sample, Log, getLogs }