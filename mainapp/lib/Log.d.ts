declare const sample: {
    user: string;
    tool: string;
    timestamp: string;
}[];
declare type Log = {
    user: string;
    tool: string;
    timestamp: string;
};
declare function getLogs(): Promise<Log[]>;
export { sample, Log, getLogs };
