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
                kg_upload_app: path.resolve(__dirname, "src/kg-upload-app.tsx"),
                graph_management: path.resolve(__dirname, "src/graph-management.tsx"),
                user_management: path.resolve(__dirname, "src/user-management.tsx"),
                SourceCreatorUploading: path.resolve(__dirname, "src/SourceCreatorUploading.tsx"),
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
