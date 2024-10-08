const fs = require("fs");
const path = require("path");
const { ProfileModel } = require("../model/profiles");
const { ToolModel } = require("../model/tools");
const { config } = require("../model/config");

const TOOL_MODEL = new ToolModel(path.join(__dirname, "data/plugins"));

describe("ProfileModel", () => {
    /**
     * @type {ProfileModel}
     */

    let profileModel;
    /**
     * @type {Record<string, import("../model/ProfileTypes").Profile>}
     */
    let profilesFromFiles;
    beforeAll(async () => {
        profileModel = new ProfileModel(TOOL_MODEL, path.join(__dirname, "data/config/profiles.json"));
        profilesFromFiles = await fs.promises.readFile(path.join(__dirname, "data/config/profiles.json")).then((data) => JSON.parse(data.toString()));
    });

    test("Can create instance", async () => {
        new ProfileModel(TOOL_MODEL, path.join(__dirname, "data/config/profiles.json"));
    });

    test("Can get all profiles if user is admin", async () => {
        const admin = {
            login: "admin",
        };
        const profiles = await profileModel.getUserProfiles(admin);
        const expectedResult = {
            ...profilesFromFiles,
            admin: {
                name: "admin",
                _type: "profile",
                id: "admin",
                allowedSourceSchemas: ["OWL", "SKOS"],
                defaultSourceAccessControl: "readwrite",
                sourcesAccessControl: {},
                allowedTools: config.tools_available,
                theme: config.theme.defaultTheme,
            },
        };
        expect(profiles).toStrictEqual(expectedResult);
    });

    test("User with no profile get no profile", async () => {
        const jdoe = {
            login: "jdoe",
            groups: [],
        };
        const profiles = await profileModel.getUserProfiles(jdoe);
        expect(profiles).toStrictEqual({});
    });

    test("User in read_folder_1 profile can get his profile", async () => {
        const jdoe = {
            login: "jdoe",
            groups: ["read_folder_1"],
        };
        const profiles = await profileModel.getUserProfiles(jdoe);
        expect(profiles).toStrictEqual({ read_folder_1: profilesFromFiles["read_folder_1"] });
    });
});
