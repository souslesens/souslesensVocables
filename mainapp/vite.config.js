import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: "static",
        rollupOptions: {
            output: {
                entryFileNames: `assets/[name].js`,
            },
        },
    },
    server: {
        proxy: {
            // string shorthand: http://localhost:5173/foo -> http://localhost:4567/foo
            "/api": "http://localhost:3010",
            // with options: http://localhost:5173/api/bar-> http://jsonplaceholder.typicode.com/bar
        },
    },
});
