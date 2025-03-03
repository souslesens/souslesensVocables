const fs = require("fs");
const path = require("path");

const { profileModel, ProfileModel } = require("../model/profiles");
const { ToolModel } = require("../model/tools");

jest.mock("../model/utils");

describe("Test the Profilemodel module", () => {
    let allTools;
    let dbProfiles;
    let toolsModel;

    beforeAll(() => {
        dbProfiles = JSON.parse(fs.readFileSync(path.join("tests", "data", "config", "profiles.json")));
        toolsModel = new ToolModel(path.join(__dirname, "data", "plugins"));
        allTools = toolsModel.allTools.filter((tool) => profileModel._mainConfig.tools_available.includes(tool.name));
    });

    test("can create instance", async () => {
        const profileModel = new ProfileModel(toolsModel);
        expect(profileModel._toolModel).toStrictEqual(toolsModel);
    });

    test("get all the profiles", async () => {
        const profiles = await profileModel.getAllProfiles();
        expect(Object.keys(profiles)).toContain("admin");
        expect(profiles.all_forbidden.theme).toStrictEqual("default");
    });

    test("get all the profiles with the existing admin profile", async () => {
        const profiles = await profileModel.getAllProfiles();
        expect(Object.keys(profiles)).toContain("admin");
        expect(profiles.admin.theme).toStrictEqual("Sea Breeze");
    });

    test("get profiles with the admin user", async () => {
        const profiles = await profileModel.getUserProfiles({ login: "admin" });
        expect(Object.keys(profiles).length).toBe(5);
        expect(profiles.all_forbidden).toStrictEqual({
            allowedSourceSchemas: ["OWL"],
            allowedTools: ["lineage", "KGcreator", "KGquery"],
            id: "all_forbidden",
            name: "all_forbidden",
            sourcesAccessControl: {},
            theme: "default",
        });
    });

    test("get profiles with an user without profile", async () => {
        const profiles = await profileModel.getUserProfiles({
            login: "jdoe",
            groups: [],
        });
        expect(profiles).toStrictEqual({});
    });

    test("get profiles with an user with one profile", async () => {
        const profiles = await profileModel.getUserProfiles({
            login: "jdoe",
            groups: ["read_folder_1"],
        });
        expect(Object.keys(profiles).length).toBe(1);
        expect(profiles.read_folder_1).toStrictEqual({
            allowedSourceSchemas: ["OWL"],
            allowedTools: ["lineage", "KGcreator", "KGquery"],
            id: "read_folder_1",
            name: "read_folder_1",
            sourcesAccessControl: {"OWL/FOLDER_1": "read"},
            theme: "",
        });
    });

    test("get tools with the admin user", async () => {
        const adminUser = {
            id: "42",
            login: "admin",
        };

        const tools = await profileModel.getUserTools(adminUser);
        expect(tools.length).toBe(allTools.length);
    });

    test("get tools with an user in the admin profile", async () => {
        const tools = await profileModel.getUserTools({ id: "42", login: "someone", groups: ["admin"] });
        expect(tools.length).toBe(allTools.length);
    });

    test("get tools with an user with an non-admin profile", async () => {
        const tools = await profileModel.getUserTools({ id: "42", login: "someone", groups: ["read_folder_1"] });
        expect(tools.length).toBe(3);
    });

    test("get tools with an user with the special ALL profile", async () => {
        const tools = await profileModel.getUserTools({ id: "42", login: "someone", groups: ["all"] });
        expect(tools.length).toBe(allTools.length);
    });

    test("get tools with an user with an unknown profile", async () => {
        const tools = await profileModel.getUserTools({ id: "42", login: "someone", groups: ["guest"] });
        expect(tools.length).toBe(0);
    });

    test("get specific profile from the admin user", async () => {
        const profile = await profileModel.getOneUserProfile({ id: "42", login: "admin", groups: [] }, "all");
        expect(profile).toStrictEqual({
            allowedSourceSchemas: ["OWL", "SKOS"],
            allowedTools: ["ALL"],
            id: "all",
            name: "all",
            sourcesAccessControl: {},
            theme: "",
        });
    });

    test("get specific profile from an user", async () => {
        const profile = await profileModel.getOneUserProfile({ id: "42", login: "someone", groups: '["all_forbidden"]' }, "all_forbidden");
        expect(profile).toStrictEqual({
            allowedSourceSchemas: ["OWL"],
            allowedTools: ["lineage", "KGcreator", "KGquery"],
            id: "all_forbidden",
            name: "all_forbidden",
            sourcesAccessControl: {},
            theme: "default",
        });
    });

    test("get an unknown profile from an user", async () => {
        const profile = await profileModel.getOneUserProfile({ id: "42", login: "someone", groups: ["read_folder_1"] }, "unknown");
        expect(profile).toBeUndefined();
    });

    test("add a new profile", async () => {
        const addedProfile = { id: "42", name: "test", theme: "SLS" };
        const identifier = await profileModel.addProfile(addedProfile);
        expect(identifier).toStrictEqual(5);
    });

    test("add a new profile with an existing name", async () => {
        const profile = { id: "42", name: "readwrite_folder_1", theme: "SLS" };

        await expect(profileModel.addProfile(profile)).rejects.toThrow("The profile already exists, try updating it");
    });

    test("add a new profile with an invalid profile", async () => {
        await expect(profileModel.addProfile("invalid")).rejects.toThrow("The profile do not follow the standard");
    });

    test("update an existing profile", async () => {
        const profile = {
            id: "3",
            name: "readwrite_folder_1",
        };

        const result = await profileModel.updateProfile(profile);
        expect(result).toBeTruthy();
    });

    test("update an unknown profile", async () => {
        const result = await profileModel.updateProfile({ id: "unknown", name: "unknown" });
        expect(result).toBeFalsy;
    });

    test("update an invalid profile", async () => {
        await expect(profileModel.updateProfile("unknown")).rejects.toThrow("The profile do not follow the standard");
    });

    test("delete an existing profile", async () => {
        const result = await profileModel.deleteProfile("readwrite_folder_1");
        expect(result).toBeTruthy();
    });

    test("delete an unknown profile", async () => {
        const result = await profileModel.deleteProfile("unknown");
        expect(result).toBeFalsy();
    });

    test("get the theme from a profile with a theme", async () => {
        const result = await profileModel.getThemeFromProfile("all_forbidden");
        expect(result).toStrictEqual("default");
    });

    test("get the theme from a profile without a theme", async () => {
        const result = await profileModel.getThemeFromProfile("read_folder_1");
        expect(result).toStrictEqual("Sea Breeze");
    });

    test("get the theme from an unknown profile", async () => {
        const result = await profileModel.getThemeFromProfile("unknown");
        expect(result).toStrictEqual("Sea Breeze");
    });

    test("test _convertToDatabase with default values", async () => {
        expect(profileModel._convertToDatabase({ name: "test" })).toStrictEqual({
            label: "test",
            theme: "",
            allowed_tools: [],
            access_control: "{}",
            schema_types: [],
        });
    });

    test("test _convertToLegacy with default values", async () => {
        const profile = {
            id: 1,
            label: "test",
            theme: "SLS",
            allowed_tools: [],
            access_control: {},
            schema_types: [],
        };

        expect(profileModel._convertToLegacy(profile)).toStrictEqual([
            "test",
            {
                id: "test",
                name: "test",
                theme: "SLS",
                allowedSourceSchemas: [],
                allowedTools: [],
                sourcesAccessControl: {},
            },
        ]);
    });
});
