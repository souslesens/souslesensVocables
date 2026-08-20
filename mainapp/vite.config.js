import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    resolve: {
        /* react-zorm resolves zod from the repository root while the webapp pins its own
         * copy, and two copies mean `schema instanceof ZodObject` is false: the profile
         * form then throws "Expected ZodObject at ... got ZodObject". One copy in the
         * bundle, whatever npm hoists. */
        dedupe: ["zod", "react", "react-dom"],
    },
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
                user_settings: path.resolve(__dirname, "src/user-settings.tsx"),
                mappingModeler_upload_app: path.resolve(__dirname, "src/mappingModeler-upload-app.tsx"),
                metadata_dialog: path.resolve(__dirname, "src/Component/MetadataModal.tsx"),
                logs_table_modal: path.resolve(__dirname, "src/Component/LogsTableModal.tsx"),
            },
            output: {
                entryFileNames: `assets/[name].js`,
            },
        },
        commonjsOptions: {
            strictRequires: "auto",
        },
        minify: false,
        sourcemap: true,
    },
    server: {
        port: parseInt(process.env.VITE_PORT || "5173"),
        proxy: {
            "/api": `http://localhost:${process.env.VITE_BACKEND_PORT || "3010"}`,
        },
    },
});
