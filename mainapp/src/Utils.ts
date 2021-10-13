const identity = <Type,>(a: Type): Type => a;

function sanitizeValue(value: string | string[]): string[] {
    return (typeof value === 'string' ? value.split(',') : value);
}

export { identity, sanitizeValue }