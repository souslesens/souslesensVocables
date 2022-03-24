const identity = <Type>(a: Type): Type => a;

function sanitizeValue(value: string | string[]): string[] {
    return typeof value === "string" ? value.split(",") : value;
}
export function exhaustiveCheck(type: never): never {
    throw new Error("Missing type");
}
export const style = {
    position: "absolute" as "absolute",
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
export { identity, sanitizeValue };
