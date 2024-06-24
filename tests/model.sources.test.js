const fs = require("fs");
const path = require("path");
const { ToolModel } = require("../model/tools");
const { ProfileModel } = require("../model/profiles");
const { SourceModel } = require("../model/sources");

const TOOL_MODEL = new ToolModel(path.join(__dirname, "data/plugins"));
const PROFILE_MODEL = new ProfileModel(TOOL_MODEL, path.join(__dirname, "data/config/profiles.json"));

describe("SourceModel", () => {
    /**
     * @type {SourceModel}
     */

    let sourceModel;
    let sourcesFromFiles;
    beforeAll(async () => {
        sourceModel = new SourceModel(PROFILE_MODEL, path.join(__dirname, "data/config/sources.json"));
        sourcesFromFiles = await fs.promises.readFile(path.join(__dirname, "data/config/sources.json")).then((data) => JSON.parse(data.toString()));
    });

    test("Can create instance", async () => {
        new SourceModel(PROFILE_MODEL, path.join(__dirname, "data/config/sources.json"));
    });

    test("Can get all sources with readwrite access if user is admin", async () => {
        const admin = {
            login: "admin",
        };
        const sources = await sourceModel.getUserSources(admin);
        const expectedResult = Object.fromEntries(
            Object.entries(sourcesFromFiles).map(([id, source]) => {
                source.accessControl = "readwrite";
                return [id, source];
            })
        );
        expect(sources).toStrictEqual(expectedResult);
    });
    test("User in all_forbidden profile can't get any sources", async () => {
        const jdoe = {
            login: "jdoe",
            groups: ["all_forbidden"],
        };
        const sources = await sourceModel.getUserSources(jdoe);
        expect(sources).toStrictEqual({});
    });
    test("User in read_folder_1 profile can get 2 sources", async () => {
        const jdoe = {
            login: "jdoe",
            groups: ["read_folder_1"],
        };
        const sources = await sourceModel.getUserSources(jdoe);
        const expectedResult = Object.fromEntries(
            Object.entries(sourcesFromFiles).filter(([id, source]) => {
                if (["SOURCE_1", "SOURCE_2"].includes(id)) {
                    source.accessControl = "read";
                    return [id, source];
                }
            })
        );
        expect(sources).toStrictEqual(expectedResult);
    });
});
