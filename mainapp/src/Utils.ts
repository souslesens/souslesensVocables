import humanNumber from "human-number";
import { styled } from "@mui/material/styles";

const identity = <Type>(a: Type): Type => a;

function joinWhenArray(stringOrArray: string | string[]): string {
    return Array.isArray(stringOrArray) ? stringOrArray.join(";") : stringOrArray;
}

function sanitizeValue(value: string | string[]): string[] {
    return typeof value === "string" ? value.split(",") : value;
}

const humanizeSize = (size: number): string => {
    return humanNumber(size, (n: string | number) => {
        if (Number.isInteger(n)) {
            return n;
        }
        return Number.parseFloat(n).toFixed(1);
    }) as string;
};

function exhaustiveCheck(): never {
    throw new Error("Missing type");
}

const style = {
    position: "absolute" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 900,
    height: "auto",
    bgcolor: "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    p: 4,
};

const VisuallyHiddenInput = styled("input")({
    clip: "rect(0 0 0 0)",
    clipPath: "inset(50%)",
    height: 1,
    overflow: "hidden",
    position: "absolute",
    bottom: 0,
    left: 0,
    whiteSpace: "nowrap",
    width: 1,
});

async function fetchMe() {
    const response = await fetch("/api/v1/auth/whoami");
    const json = await response.json();
    return json;
}

function cleanUpText(original: unknown): string {
    if (typeof original !== "string") {
        return "";
    }

    // Clean up accents
    return original
        .toLocaleLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");
}

function jsonToDownloadUrl(json: unknown): string {
    const content = JSON.stringify(json, undefined, 2);
    const file = new Blob([content], { type: "application/json" });
    return URL.createObjectURL(file);
}

export { fetchMe, identity, joinWhenArray, sanitizeValue, exhaustiveCheck, style, VisuallyHiddenInput, humanizeSize, cleanUpText, jsonToDownloadUrl };
