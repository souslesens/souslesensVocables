const path = require("path");
const { ToolModel } = require("../model/tools");

const TEST_PLUGINS_PATH = path.join(__dirname, "data/plugins");

describe("ToolModel", () => {
    let toolModel;

    beforeAll(() => {
        toolModel = new ToolModel(TEST_PLUGINS_PATH);
    });

    test("Can create the instance of ToolModel", async () => {
        new ToolModel(TEST_PLUGINS_PATH);
    });

    test("Check the tools lists", async () => {
        // Related to NATIVE_TOOLS content from model/tools.js
        for (const tool of toolModel.nativeTools) {
            expect(tool).toHaveProperty("type");
            expect(tool).toHaveProperty("label");
            expect(tool).toHaveProperty("name");
            expect(tool).toHaveProperty("controller");
            expect(tool).toHaveProperty("useSource");
            expect(tool).toHaveProperty("multiSources");
            expect(tool).toHaveProperty("toTools");
        }
    });

    test("Check the plugins lists", async () => {
        expect(toolModel.plugins.length).toStrictEqual(1);
    });

    test("Check the plugin object", async () => {
        const plugin = toolModel.plugins[0];
        expect(plugin).toStrictEqual({
            config: {
                boolean: true,
                number: 42,
                string: "hello",
            },
            name: "Test",
            type: "plugin",
        });
    });

    test("Convert the configuration", async () => {
        const plugins = {
            Test: {
                boolean: " false",
                number: " 1337 ",
                string: " HELLO WORLD! ",
            },
        };

        const results = await toolModel.convertPluginsConfig(plugins);
        expect(results).toStrictEqual({
            Test: {
                boolean: false,
                number: 1337,
                string: "HELLO WORLD!",
            },
        });
    });

    test("Tokenize Url", async () => {
        const results = await toolModel._getTokenizeURL("https://github.com/souslesens/", "my_token");
        expect(results).toStrictEqual("https://token:my_token@github.com/souslesens/");
    });

    test("Read/Write config", async () => {
        let config_before = toolModel.readConfig();
        const plugins = {
            Test: {
                boolean: false,
                number: 1337,
                string: "HELLO WORLD!",
            },
        };
        await toolModel.writeConfig(plugins);
        const result = toolModel.readConfig();
        expect(result).toStrictEqual(plugins);
        await toolModel.writeConfig(config_before);
    });

    test("Get non existing Repository tag", async () => {
        const result = await toolModel.getRepositoryTags("Test");
        expect(result.status).toStrictEqual('failure');
        expect(result.message).toStrictEqual('Cannot found the identifier in the plugins directory');
    });
});
