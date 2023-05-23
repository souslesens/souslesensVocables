import { atom } from "nanostores";

export const state = atom<State>("Init");

export function goToNext() {
    const currentState = state.get();
    if (currentState === "Init") {
        state.set("OtherState");
    }
}

type State = "Init" | "OtherState";
