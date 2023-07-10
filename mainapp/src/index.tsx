import * as React from "react";
import Admin from "./Admin";
import { createRoot } from "react-dom/client";

const container = document.getElementById("mount-app-here");
const root = createRoot(container!);
root.render(<Admin />);
