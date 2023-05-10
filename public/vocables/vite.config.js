import { defineConfig } from "vite";

const serverAdress = "http://localhost:3010";
export default defineConfig({
    plugins: [],
    build: {},
    server: {
        proxy: {
            "/api": serverAdress,
            "/assets": serverAdress,
            "/vocables/images": serverAdress,
            "/vocables/snippets": serverAdress,
            "/icons": serverAdress,
            "/vocables/icons": serverAdress,
            "/scripts": serverAdress + "/vocables",
        },
    },
});
