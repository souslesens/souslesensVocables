const identity = <Type>(a: Type): Type => a;

function joinWhenArray(stringOrArray: string | string[]): string {
    return Array.isArray(stringOrArray) ? stringOrArray.join(";") : stringOrArray;
}

function sanitizeValue(value: string | string[]): string[] {
    return typeof value === "string" ? value.split(",") : value;
}

function exhaustiveCheck(): never {
    throw new Error("Missing type");
}

const style = {
    position: "absolute" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 800,
    height: "auto",
    bgcolor: "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    p: 4,
};

export { identity, joinWhenArray, sanitizeValue, exhaustiveCheck, style };
