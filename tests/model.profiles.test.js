const fs = require("fs");
const path = require("path");

const { createTracker, MockClient } = require("knex-mock-client");

const { config } = require("../model/config");
const { profileModel, ProfileModel } = require("../model/profiles");
const { ToolModel } = require("../model/tools");
const { cleanupConnection, getKnexConnection } = require("../model/utils");


jest.mock("../model/utils", () => {
    const knex = require("knex");
    return {
        cleanupConnection: jest.fn().mockReturnThis(),
        getKnexConnection: knex({ client: MockClient, dialect: "pg" }),
    };
});


describe("ProfileModel", () => {
    let tracker;
    let dbProfiles;

    beforeAll(() => {
        tracker = createTracker(getKnexConnection);

        dbProfiles = JSON.parse(fs.readFileSync(
            path.join(__dirname, "data", "config", "profiles.json")
        ));
    });

    afterEach(() => {
        tracker.reset();
    });

    test("Can create instance", async () => {
        new ProfileModel(
            new ToolModel(path.join(__dirname, "data", "plugins")),
            path.join(__dirname, "data", "config", "profiles.json"),
        );
    });

    test("Can get all profiles if user is admin", async () => {
        tracker.on.select("profiles_list").response(dbProfiles);

        const profiles = await profileModel.getUserProfiles({ login: "admin" });
        expect(Object.keys(profiles).length).toBe(4);
        expect(profiles.all_forbidden).toStrictEqual({
            "allowedSourceSchemas": [
                "OWL",
            ],
            "allowedTools": [
                "lineage",
                "KGcreator",
                "KGquery",
            ],
            "id": "all_forbidden",
            "name": "all_forbidden",
            "sourcesAccessControl": {},
            "theme": "default",
        });
    });

    test("User with no profile get no profile", async () => {
        tracker.on.select("profiles_list").response(dbProfiles);

        const profiles = await profileModel.getUserProfiles({
            login: "jdoe",
            groups: [],
        });
        expect(profiles).toStrictEqual({});
    });

    test("User in read_folder_1 profile can get his profile", async () => {
        tracker.on.select("profiles_list").response(dbProfiles);

        const profiles = await profileModel.getUserProfiles({
            login: "jdoe",
            groups: ["read_folder_1"],
        });
        expect(Object.keys(profiles).length).toBe(1);
        expect(profiles.read_folder_1).toStrictEqual({
            "allowedSourceSchemas": [
                "OWL",
            ],
            "allowedTools": [
                "lineage",
                "KGcreator",
                "KGquery",
            ],
            "id": "read_folder_1",
            "name": "read_folder_1",
            "sourcesAccessControl": {
                "OWL/FOLDER_1": "read",
            },
            "theme": undefined,
        });
    });
});
