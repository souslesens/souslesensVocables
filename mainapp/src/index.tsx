import * as React from "react";
import Admin from "./Admin";
import { createRoot } from "react-dom/client";

declare global {
    interface Window {
        ConfigEditor: {
            createApp: () => void;
        };
    }
}
window.ConfigEditor.createApp = function createApp() {
    const container = document.getElementById("mount-app-here");
    const root = createRoot(container!);
    root.render(<Admin />);
    return root.unmount.bind(root);
};
