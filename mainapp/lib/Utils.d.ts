declare const identity: <Type>(a: Type) => Type;
declare function sanitizeValue(value: string | string[]): string[];
export { identity, sanitizeValue };
