import Admin from "./Admin";
import { createRoot } from "react-dom/client";

import { ServerSource } from "./Source";

declare global {
    interface Window {
        ConfigEditor: {
            createApp: () => void;
        };
        Config: {
            slsvColorThemes: Array<Record<string, string>>;
            sources: Record<string, ServerSource>;
            // There are more config properties but we only use this one in mainapp
        };
    }
}
window.ConfigEditor.createApp = function createApp() {
    const container = document.getElementById("mount-app-here");

    const root = createRoot(container!);
    root.render(<Admin />);
    return root.unmount.bind(root);
};
