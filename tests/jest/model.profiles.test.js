import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { jest } from "@jest/globals";
import { cleanupConnection as cleanupConnectionMock, getKnexConnection as getKnexConnectionMock } from "../../model/__mocks__/utils.js";
import { convertType } from "../../model/utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

jest.unstable_mockModule("../../model/utils.js", () => ({ cleanupConnection: cleanupConnectionMock, getKnexConnection: getKnexConnectionMock, convertType: convertType }));

const { profileModel, ProfileModel } = await import("../../model/profiles.js");
const { ToolModel } = await import("../../model/tools.js");

describe("Test the Profilemodel module", () => {
    let allTools;
    let dbProfiles;
    let toolsModel;

    beforeAll(() => {
        dbProfiles = JSON.parse(fs.readFileSync(path.join("tests", "data", "config", "profiles.json")));
        toolsModel = new ToolModel(path.join(__dirname, "../data", "plugins"));
        allTools = toolsModel.allTools.filter((tool) => profileModel._mainConfig.tools_available.includes(tool.name));
    });

    test("can create instance", async () => {
        const profileModelInstance = new ProfileModel(toolsModel);
        expect(profileModelInstance._toolModel).toStrictEqual(toolsModel);
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
            allowedDatabases: [],
            isShared: true,
            id: "read_folder_1",
            name: "read_folder_1",
            sourcesAccessControl: { "OWL/FOLDER_1": "read" },
            theme: "",
            quota: {},
            maxNtExportTriples: 5000,
            allowSourceCreation: true,
            maxNumberCreatedSource: 2,
            maxWritableTriplesPerUser: 1000,
            maxUploadTriplesPerUser: 500,
            maxUserDataRecordsPerUser: 20,
            maxVirtuosoLoad: 70,
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
        expect(tools.length).toBe(3); // 2 allowedTools + 1 publicTools
    });

    test("get tools with an user with the special ALL profile", async () => {
        const tools = await profileModel.getUserTools({ id: "42", login: "someone", groups: ["all"] });
        expect(tools.length).toBe(allTools.length);
    });

    test("get tools with an user with an unknown profile", async () => {
        const tools = await profileModel.getUserTools({ id: "42", login: "someone", groups: ["guest"] });
        expect(tools.length).toBe(1); // 1 publicTool
    });

    test("get specific profile from the admin user", async () => {
        const profile = await profileModel.getOneUserProfile({ id: "42", login: "admin", groups: [] }, "all");
        expect(profile).toStrictEqual({
            allowedSourceSchemas: ["OWL", "SKOS"],
            allowedTools: ["ALL"],
            allowedDatabases: [],
            isShared: true,
            id: "all",
            name: "all",
            sourcesAccessControl: {},
            theme: "",
            quota: {},
            maxNtExportTriples: undefined,
            allowSourceCreation: undefined,
            maxNumberCreatedSource: undefined,
            maxWritableTriplesPerUser: undefined,
            maxUploadTriplesPerUser: undefined,
            maxUserDataRecordsPerUser: undefined,
            maxVirtuosoLoad: undefined,
        });
    });

    test("get specific profile from an user", async () => {
        const profile = await profileModel.getOneUserProfile({ id: "42", login: "someone", groups: '["all_forbidden"]' }, "all_forbidden");
        expect(profile).toStrictEqual({
            allowedSourceSchemas: ["OWL"],
            allowedTools: ["lineage", "KGcreator", "KGquery"],
            allowedDatabases: [],
            isShared: true,
            id: "all_forbidden",
            name: "all_forbidden",
            sourcesAccessControl: {},
            theme: "default",
            quota: {},
            maxNtExportTriples: undefined,
            allowSourceCreation: undefined,
            maxNumberCreatedSource: undefined,
            maxWritableTriplesPerUser: undefined,
            maxUploadTriplesPerUser: undefined,
            maxUserDataRecordsPerUser: undefined,
            maxVirtuosoLoad: undefined,
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
            allowed_databases: [],
            is_shared: true,
            access_control: "{}",
            quota: null,
            max_nt_export_triples: null,
            create_source: null,
            maximum_source: null,
            max_writable_triples: null,
            max_upload_triples: null,
            max_user_data_records: null,
            max_virtuoso_load: null,
            schema_types: [],
        });
    });

    test("test _convertToDatabase with a maxNtExportTriples value", async () => {
        expect(profileModel._convertToDatabase({ name: "test", maxNtExportTriples: 5000 })).toStrictEqual({
            label: "test",
            theme: "",
            allowed_tools: [],
            allowed_databases: [],
            is_shared: true,
            access_control: "{}",
            quota: null,
            max_nt_export_triples: 5000,
            create_source: null,
            maximum_source: null,
            max_writable_triples: null,
            max_upload_triples: null,
            max_user_data_records: null,
            max_virtuoso_load: null,
            schema_types: [],
        });
    });

    test("test _convertToDatabase with source creation rights", async () => {
        expect(profileModel._convertToDatabase({ name: "test", allowSourceCreation: true, maxNumberCreatedSource: 3 })).toStrictEqual({
            label: "test",
            theme: "",
            allowed_tools: [],
            allowed_databases: [],
            is_shared: true,
            access_control: "{}",
            quota: null,
            max_nt_export_triples: null,
            create_source: true,
            maximum_source: 3,
            max_writable_triples: null,
            max_upload_triples: null,
            max_user_data_records: null,
            max_virtuoso_load: null,
            schema_types: [],
        });
    });

    test("test _convertToLegacy with default values", async () => {
        const profile = {
            id: 1,
            label: "test",
            theme: "SLS",
            allowed_tools: [],
            allowed_databases: [],
            is_shared: true,
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
                allowedDatabases: [],
                isShared: true,
                sourcesAccessControl: {},
                quota: {},
                maxNtExportTriples: undefined,
                allowSourceCreation: undefined,
                maxNumberCreatedSource: undefined,
                maxWritableTriplesPerUser: undefined,
                maxUploadTriplesPerUser: undefined,
                maxUserDataRecordsPerUser: undefined,
                maxVirtuosoLoad: undefined,
            },
        ]);
    });

    test("test _convertToLegacy with a maxNtExportTriples value", async () => {
        const profile = {
            id: 1,
            label: "test",
            theme: "SLS",
            allowed_tools: [],
            allowed_databases: [],
            is_shared: true,
            access_control: {},
            schema_types: [],
            max_nt_export_triples: 5000,
        };

        expect(profileModel._convertToLegacy(profile)).toStrictEqual([
            "test",
            {
                id: "test",
                name: "test",
                theme: "SLS",
                allowedSourceSchemas: [],
                allowedTools: [],
                allowedDatabases: [],
                isShared: true,
                sourcesAccessControl: {},
                quota: {},
                maxNtExportTriples: 5000,
                allowSourceCreation: undefined,
                maxNumberCreatedSource: undefined,
                maxWritableTriplesPerUser: undefined,
                maxUploadTriplesPerUser: undefined,
                maxUserDataRecordsPerUser: undefined,
                maxVirtuosoLoad: undefined,
            },
        ]);
    });

    test("test _convertToLegacy with source creation rights", async () => {
        const profile = {
            id: 1,
            label: "test",
            theme: "SLS",
            allowed_tools: [],
            allowed_databases: [],
            is_shared: true,
            access_control: {},
            schema_types: [],
            create_source: 1,
            maximum_source: 3,
        };

        expect(profileModel._convertToLegacy(profile)).toStrictEqual([
            "test",
            {
                id: "test",
                name: "test",
                theme: "SLS",
                allowedSourceSchemas: [],
                allowedTools: [],
                allowedDatabases: [],
                isShared: true,
                sourcesAccessControl: {},
                quota: {},
                maxNtExportTriples: undefined,
                allowSourceCreation: true,
                maxNumberCreatedSource: 3,
                maxWritableTriplesPerUser: undefined,
                maxUploadTriplesPerUser: undefined,
                maxUserDataRecordsPerUser: undefined,
                maxVirtuosoLoad: undefined,
            },
        ]);
    });

    test("test _convertToLegacy with quota values", async () => {
        const profile = {
            id: 1,
            label: "test",
            theme: "SLS",
            allowed_tools: [],
            allowed_databases: [],
            is_shared: true,
            access_control: {},
            schema_types: [],
            quota: JSON.stringify({
                "/api/v1/test": {
                    GET: 100,
                    POST: 50,
                },
            }),
        };

        expect(profileModel._convertToLegacy(profile)).toStrictEqual([
            "test",
            {
                id: "test",
                name: "test",
                theme: "SLS",
                allowedSourceSchemas: [],
                allowedTools: [],
                allowedDatabases: [],
                isShared: true,
                sourcesAccessControl: {},
                quota: {
                    "/api/v1/test": {
                        GET: 100,
                        POST: 50,
                    },
                },
                maxNtExportTriples: undefined,
                allowSourceCreation: undefined,
                maxNumberCreatedSource: undefined,
                maxWritableTriplesPerUser: undefined,
                maxUploadTriplesPerUser: undefined,
                maxUserDataRecordsPerUser: undefined,
                maxVirtuosoLoad: undefined,
            },
        ]);
    });

    test("test _checkProfile with invalid quota values", async () => {
        const invalidProfile = {
            id: "test",
            name: "test",
            theme: "SLS",
            allowed_tools: [],
            allowed_databases: [],
            is_shared: true,
            access_control: {},
            schema_types: [],
            quota: "invalid",
        };

        expect(() => profileModel._checkProfile(invalidProfile)).toThrow();
    });

    test("test _checkProfile with quota containing non-number values", async () => {
        const invalidProfile = {
            id: "test",
            name: "test",
            theme: "SLS",
            allowed_tools: [],
            allowed_databases: [],
            is_shared: true,
            access_control: {},
            schema_types: [],
            quota: {
                "/api/v1/test": {
                    GET: "not-a-number",
                },
            },
        };

        expect(() => profileModel._checkProfile(invalidProfile)).toThrow();
    });

    test("test _checkProfile with null quota", async () => {
        const invalidProfile = {
            id: "test",
            name: "test",
            theme: "SLS",
            allowed_tools: [],
            allowed_databases: [],
            is_shared: true,
            access_control: {},
            schema_types: [],
            quota: null,
        };

        expect(() => profileModel._checkProfile(invalidProfile)).toThrow();
    });

    test("getMaxNtExportTriplesForUser is unlimited for the admin login", async () => {
        const result = await profileModel.getMaxNtExportTriplesForUser({ id: "42", login: "admin", groups: [] });
        expect(result).toBeUndefined();
    });

    test("getMaxNtExportTriplesForUser is unlimited for an user holding the admin profile", async () => {
        const result = await profileModel.getMaxNtExportTriplesForUser({ id: "42", login: "someone", groups: ["admin"] });
        expect(result).toBeUndefined();
    });

    test("getMaxNtExportTriplesForUser returns the profile's cap for a single-profile user", async () => {
        const result = await profileModel.getMaxNtExportTriplesForUser({ id: "42", login: "someone", groups: ["read_folder_1"] });
        expect(result).toBe(5000);
    });

    test("getMaxNtExportTriplesForUser returns the highest cap across a multi-profile user", async () => {
        const result = await profileModel.getMaxNtExportTriplesForUser({ id: "42", login: "someone", groups: ["read_folder_1", "readwrite_folder_1"] });
        expect(result).toBe(5000);
    });

    test("getMaxNtExportTriplesForUser forbids when no profile of the user sets a cap", async () => {
        const result = await profileModel.getMaxNtExportTriplesForUser({ id: "42", login: "someone", groups: ["all_forbidden"] });
        expect(result).toBe(0);
    });

    test("getMaxVirtuosoLoadForUser is unlimited for the admin login", async () => {
        const result = await profileModel.getMaxVirtuosoLoadForUser({ id: "42", login: "admin", groups: [] });
        expect(result).toBeUndefined();
    });

    test("getMaxVirtuosoLoadForUser is unlimited for an user holding the admin profile", async () => {
        const result = await profileModel.getMaxVirtuosoLoadForUser({ id: "42", login: "someone", groups: ["admin"] });
        expect(result).toBeUndefined();
    });

    test("getMaxVirtuosoLoadForUser returns the profile's threshold for a single-profile user", async () => {
        const result = await profileModel.getMaxVirtuosoLoadForUser({ id: "42", login: "someone", groups: ["read_folder_1"] });
        expect(result).toBe(70);
    });

    test("getMaxVirtuosoLoadForUser returns the highest threshold across a multi-profile user", async () => {
        const result = await profileModel.getMaxVirtuosoLoadForUser({ id: "42", login: "someone", groups: ["read_folder_1", "readwrite_folder_1"] });
        expect(result).toBe(90);
    });

    test("getMaxVirtuosoLoadForUser is unlimited when no profile of the user sets a threshold", async () => {
        const result = await profileModel.getMaxVirtuosoLoadForUser({ id: "42", login: "someone", groups: ["all_forbidden"] });
        expect(result).toBeUndefined();
    });

    test("getLimitsForUser returns the limits of a single-profile user", async () => {
        profileModel._clearProfileCaches();
        const result = await profileModel.getLimitsForUser({ id: "42", login: "someone", groups: ["read_folder_1"] });
        expect(result).toStrictEqual({
            allowSourceCreation: true,
            maxNumberCreatedSource: 2,
            maxWritableTriplesPerUser: 1000,
            maxUploadTriplesPerUser: 500,
            maxUserDataRecordsPerUser: 20,
        });
    });

    test("getLimitsForUser keeps the most permissive limits across profiles", async () => {
        profileModel._clearProfileCaches();
        const result = await profileModel.getLimitsForUser({ id: "42", login: "someone", groups: ["readwrite_folder_1", "read_folder_1"] });
        expect(result).toStrictEqual({
            allowSourceCreation: true,
            maxNumberCreatedSource: 10,
            maxWritableTriplesPerUser: 5000,
            // 500 beats the 0 carried by readwrite_folder_1: the highest cap wins.
            maxUploadTriplesPerUser: 500,
            // Only read_folder_1 defines this one, so it applies unopposed.
            maxUserDataRecordsPerUser: 20,
        });
    });

    test("getLimitsForUser leaves every limit undefined when no profile defines them", async () => {
        profileModel._clearProfileCaches();
        const result = await profileModel.getLimitsForUser({ id: "42", login: "someone", groups: ["all_forbidden"] });
        expect(result).toStrictEqual({
            allowSourceCreation: undefined,
            maxNumberCreatedSource: undefined,
            maxWritableTriplesPerUser: undefined,
            maxUploadTriplesPerUser: undefined,
            maxUserDataRecordsPerUser: undefined,
        });
    });

    test("getLimitsForUser forbids creation when the only profile forbids it", async () => {
        profileModel._clearProfileCaches();
        const result = await profileModel.getLimitsForUser({ id: "42", login: "someone", groups: ["readwrite_folder_1"] });
        expect(result).toStrictEqual({
            allowSourceCreation: false,
            maxNumberCreatedSource: 10,
            maxWritableTriplesPerUser: 5000,
            maxUploadTriplesPerUser: 0,
            maxUserDataRecordsPerUser: undefined,
        });
    });

    test("getLimitsForUser keeps a cap of 0, which forbids rather than being missing", async () => {
        profileModel._clearProfileCaches();
        const result = await profileModel.getLimitsForUser({ id: "42", login: "someone", groups: ["readwrite_folder_1"] });
        expect(result.maxUploadTriplesPerUser).toBe(0);
        expect(result.maxUploadTriplesPerUser).not.toBeUndefined();
    });
});
