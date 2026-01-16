import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { createTracker, MockClient } from "knex-mock-client";
import knex from "knex";

import { ProfileModel } from "../model/profiles.js";
import { SourceModel } from "../model/sources.js";
import { ToolModel } from "../model/tools.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockKnexConnection = knex({ client: MockClient, dialect: "pg" });

jest.unstable_mockModule("../model/utils.js", () => ({
    cleanupConnection: jest.fn().mockReturnThis(),
    getKnexConnection: mockKnexConnection,
}));

const { cleanupConnection, getKnexConnection } = await import("../model/utils.js");

const TOOL_MODEL = new ToolModel(path.join(__dirname, "data/plugins"));
const PROFILE_MODEL = new ProfileModel(TOOL_MODEL, path.join(__dirname, "data/config/profiles.json"));

describe("SourceModel", () => {
    let dbProfiles;
    let sourceModel;
    let sourcesFromFiles;
    let tracker;

    beforeAll(async () => {
        sourceModel = new SourceModel(PROFILE_MODEL, path.join(__dirname, "data", "config", "sources.json"));
        sourcesFromFiles = await fs.promises.readFile(path.join(__dirname, "data", "config", "sources.json")).then((data) => JSON.parse(data.toString()));

        tracker = createTracker(getKnexConnection);

        dbProfiles = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "config", "profiles.json")));
    });

    afterEach(() => {
        tracker.reset();
    });

    test("Can create instance", async () => {
        new SourceModel(PROFILE_MODEL, path.join(__dirname, "data", "config", "sources.json"));
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
            }),
        );
        expect(sources).toStrictEqual(expectedResult);
    });

    test("User in all_forbidden profile can't get any sources", async () => {
        tracker.on.select("profiles_list").response(dbProfiles);

        const jdoe = {
            login: "jdoe",
            groups: ["all_forbidden"],
        };
        const sources = await sourceModel.getUserSources(jdoe);
        expect(sources).toStrictEqual({});
    });

    test("User in read_folder_1 profile can get 2 sources", async () => {
        tracker.on.select("profiles_list").response(dbProfiles);

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
            }),
        );
        expect(sources).toStrictEqual(expectedResult);
    });

    test("get one user sources", async () => {
        tracker.on.select("profiles_list").response(dbProfiles);
        const user = { login: "admin", groups: [] };
        const source = await sourceModel.getOneUserSource(user, "SOURCE_2");
        expect(source.name).toStrictEqual("SOURCE_2");
    });

    test("get unknow user sources", async () => {
        tracker.on.select("profiles_list").response(dbProfiles);
        const user = { login: "doe", groups: [] };
        const source = await sourceModel.getOneUserSource(user, "SOURCE_2");
        expect(source === undefined).toBe(true);
    });

    test("get owned user sources", async () => {
        tracker.on.select("profiles_list").response(dbProfiles);
        const user = { login: "admin", groups: [] };
        const sources = await sourceModel.getOwnedSources(user);
        expect(Object.entries(sources).length).toStrictEqual(3);
        Object.entries(sources).map(([_, src]) => {
            expect(src.owner).toStrictEqual(user.login);
        });
    });
});
