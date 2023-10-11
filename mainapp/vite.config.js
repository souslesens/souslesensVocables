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
