import { jest } from "@jest/globals";

import { MainConfigObject, checkMainConfig, checkMainConfigSection, colorText, printErrorReport, readMainConfig } from "../model/config.js";

const retrieveLogs = (config) => {
    const results = MainConfigObject.safeParse(config);
    if (!results.success) {
        const errors = checkMainConfigSection(results.error.format(), {});
        return printErrorReport(errors, null);
    }
    return [];
};

describe("model/config", () => {
    beforeAll(() => {
        // Hide the console methods from the checking function
        jest.spyOn(console, "error").mockImplementation(() => {});
        jest.spyOn(console, "info").mockImplementation(() => {});
        jest.spyOn(console, "debug").mockImplementation(() => {});
    });

    test("read the main config", async () => {
        const config = readMainConfig();
        expect(config.auth).toStrictEqual("database");
        expect(config.theme.defaultTheme).toStrictEqual("Sea Breeze");
    });

    test("check the main config with correct syntax", async () => {
        const config = readMainConfig();
        const result = checkMainConfig(config);
        expect(result).toBeTruthy();
    });

    test("check the main config with invalid syntax", async () => {
        const config = readMainConfig();
        delete config.auth;

        const result = checkMainConfig(config);
        expect(result).toBeFalsy();
    });

    test("print the error report with missing option", async () => {
        let config = readMainConfig();

        delete config.auth;
        expect(retrieveLogs(config)).toStrictEqual([`⛔ The option ${colorText("auth")} is missing`]);

        delete config.database;
        expect(retrieveLogs(config)).toStrictEqual([`⛔ The option ${colorText("auth")} is missing`, `⛔ The option ${colorText("database")} is missing`]);

        config = readMainConfig();
        delete config.database.port;
        expect(retrieveLogs(config)).toStrictEqual([`⛔ The option ${colorText("database.port")} is missing`]);
    });

    test("print the error report with wrong values", async () => {
        const config = readMainConfig();
        config.database.port = "5432";
        expect(retrieveLogs(config)).toStrictEqual([`❌ Wrong value for the option ${colorText("database.port")}: Expected number, received string`]);
    });

    test("print the error report with unknown keys", async () => {
        const config = readMainConfig();
        config.database.unknown = "test";
        expect(retrieveLogs(config)).toStrictEqual([`❓ Unknown key(s) for the option ${colorText("database")}: 'unknown'`]);

        config.test = 42;
        expect(retrieveLogs(config)).toStrictEqual([`❓ Unknown key(s): 'test'`, `❓ Unknown key(s) for the option ${colorText("database")}: 'unknown'`]);
    });

    test("check the colorText function", async () => {
        expect(colorText("test")).toStrictEqual(`\x1b[31;1mtest\x1b[0m`);
        expect(colorText("test", "32")).toStrictEqual(`\x1b[32mtest\x1b[0m`);
    });
});
