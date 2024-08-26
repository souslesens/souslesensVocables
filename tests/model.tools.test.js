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
        expect(toolModel.nativeTools.length).toStrictEqual(12);
    });

    test("Check the plugins lists", async () => {
        expect(toolModel.plugins.length).toStrictEqual(1);
    });

    test("Check the plugin object", async () => {
        const plugin = toolModel.plugins[0];
        expect(plugin).toStrictEqual({
            config: {
                "boolean": true,
                "number": 42,
                "string": "hello",
            },
            name: "Test",
            type: "plugin",
        });
    });

    test("Convert the configuration", async () => {
        const plugins = {
            "Test": {
                "boolean": " false",
                "number": " 1337 ",
                "string": " HELLO WORLD! ",
            }
        };

        const results = await toolModel.convertPluginsConfig(plugins);
        expect(results).toStrictEqual({
            "Test": {
                "boolean": false,
                "number": 1337,
                "string": "HELLO WORLD!",
            }
        });
    });
});
