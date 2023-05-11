import { atom } from "nanostores";

export const errors = atom<string[]>([]);

export function addError(error: string) {
    errors.set([...errors.get(), error]);
}

