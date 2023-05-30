import { atom } from "nanostores";

export const counter = atom(0);

export const increment = () => counter.set(counter.get() + 1);
