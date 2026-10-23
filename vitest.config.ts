import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["mainapp/src/**/*.test.ts"],
        environment: "node",
        passWithNoTests: true,
    },
});
