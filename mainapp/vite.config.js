import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: "static",
        rollupOptions: {
            input: {
                index: path.resolve(__dirname, "src/index.tsx"),
                edit_source_dialog: path.resolve(__dirname, "src/Component/EditSourceDialog.tsx"),
                download_graph_modal: path.resolve(__dirname, "src/Component/DownloadGraphModal.tsx"),
                upload_graph_modal: path.resolve(__dirname, "src/Component/UploadGraphModal.tsx"),
                kg_upload_app: path.resolve(__dirname, "src/kg-upload-app.tsx"),
                graph_management: path.resolve(__dirname, "src/graph-management.tsx"),
                user_management: path.resolve(__dirname, "src/user-management.tsx"),
                mappingModeler_upload_app: path.resolve(__dirname, "src/mappingModeler-upload-app.tsx"),
            },
            output: {
                entryFileNames: `assets/[name].js`,
            },
        },
    },
    server: {
        proxy: {
            "/api": "http://localhost:3010",
        },
    },
});
