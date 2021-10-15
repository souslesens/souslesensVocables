declare const identity: <Type>(a: Type) => Type;
declare function sanitizeValue(value: string | string[]): string[];
export declare function exhaustiveCheck(type: never): never;
export declare const style: {
    position: "absolute";
    top: string;
    left: string;
    transform: string;
    width: number;
    height: number;
    bgcolor: string;
    border: string;
    boxShadow: number;
    p: number;
};
export { identity, sanitizeValue };
