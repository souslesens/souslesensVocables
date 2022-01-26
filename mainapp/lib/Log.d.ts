declare type Log = {
    user: string;
    tool: string;
    timestamp: string;
};
declare function getLogs(): Promise<Log[]>;
export { Log, getLogs };
