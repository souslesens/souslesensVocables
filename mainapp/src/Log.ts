export type Log = { user: string; tool: string; source: string; action: string; timestamp: string };

export type LogFiles = {
    status: number;
    message: Array<{
        date: string;
        current: boolean;
    }>;
};

const endpoint = "/api/v1/logs";
export async function getLogFiles(): Promise<LogFiles> {
    //return {};
    const response = await fetch(endpoint);
    const json = (await response.json()) as Promise<LogFiles>;
    return json;
}

export async function getLogs(file: string): Promise<Log[]> {
    const response = await fetch(endpoint + "/" + file);
    const json = (await response.json()) as Log[];
    return json;
}

export async function getLogsByDateRange(startDate: string, endDate: string): Promise<Log[]> {
    const logFilesResponse = await getLogFiles();
    const logFiles = logFilesResponse.message;

    const startMonth = startDate.substring(0, 7);
    const endMonth = endDate.substring(0, 7);

    const relevantFiles = logFiles.filter((file) => {
        return file.date >= startMonth && file.date <= endMonth;
    });

    const logsPromises = relevantFiles.map((file) => getLogs(file.date));
    const logsArrays = await Promise.all(logsPromises);

    const allLogs = logsArrays.flat();
    const filteredLogs = allLogs.filter((log) => {
        const logDate = log.timestamp.substring(0, 10);
        return logDate >= startDate && logDate <= endDate;
    });

    return filteredLogs;
}

export async function writeLog(user: string, tool: string, action: string, source: string): Promise<number> {
    const body = { infos: `${user},${tool},${source},${action}` };

    const response = await fetch(endpoint, {
        method: "post",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
    });
    await response.json();

    return response.status;
}
