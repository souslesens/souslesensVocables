import Admin from "./Admin";
import { createRoot } from "react-dom/client";

declare global {
    interface Window {
        ConfigEditor: {
            createApp: () => void;
        };
        Config: {
            slsvColorThemes: Array<Record<string, string>>;
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
