import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { jest } from "@jest/globals";

import { createTracker, MockClient } from "knex-mock-client";
import knex from "knex";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockKnexConnection = knex({ client: MockClient, dialect: "pg" });

jest.unstable_mockModule("../../model/utils.js", () => ({
    cleanupConnection: jest.fn(),
    getKnexConnection: jest.fn(() => mockKnexConnection),
    convertType: jest.fn((value) => value),
    chunk: jest.fn((list, size) => [list]),
    redoIfFailure: jest.fn(),
    redoIfFailureCallback: jest.fn(),
    sleep: jest.fn(),
    RDF_FORMATS_MIMETYPES: {},
}));

const { cleanupConnection, getKnexConnection } = await import("../../model/utils.js");
const { ProfileModel } = await import("../../model/profiles.js");
const { SourceModel } = await import("../../model/sources.js");
const { ToolModel } = await import("../../model/tools.js");

const TOOL_MODEL = new ToolModel(path.join(__dirname, "../data/plugins"));
const PROFILE_MODEL = new ProfileModel(TOOL_MODEL, path.join(__dirname, "../data/config/profiles.json"));

describe("SourceModel", () => {
    let dbProfiles;
    let sourceModel;
    let sourcesFromFiles;
    let tracker;

    beforeAll(async () => {
        sourceModel = new SourceModel(PROFILE_MODEL, path.join(__dirname, "../data", "config", "sources.json"));
        sourcesFromFiles = await fs.promises.readFile(path.join(__dirname, "../data", "config", "sources.json")).then((data) => JSON.parse(data.toString()));

        tracker = createTracker(mockKnexConnection);

        dbProfiles = JSON.parse(fs.readFileSync(path.join(__dirname, "../data", "config", "profiles.json")));
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

    test("A source marked not editable stays read even when the profile grants readwrite", async () => {
        tracker.on.select("profiles_list").response(dbProfiles);

        const jdoe = {
            login: "jdoe",
            groups: ["readwrite_folder_1"],
        };
        const sources = await sourceModel.getUserSources(jdoe);
        expect(sources["SOURCE_1"].accessControl).toStrictEqual("readwrite");
        expect(sources["SOURCE_2"].accessControl).toStrictEqual("read");
    });

    test("canWrite follows the access control of the source", async () => {
        tracker.on.select("profiles_list").response(dbProfiles);

        const jdoe = {
            login: "jdoe",
            groups: ["readwrite_folder_1"],
        };
        expect(await sourceModel.canWrite(jdoe, { name: "SOURCE_1" })).toBe(true);
        expect(await sourceModel.canWrite(jdoe, { name: "SOURCE_2" })).toBe(false);
        expect(await sourceModel.canWrite(jdoe, { name: "SOURCE_3" })).toBe(false);
        expect(await sourceModel.canWrite(jdoe, { graphUri: "http://data.exemple.org/source_1" })).toBe(true);
        expect(await sourceModel.canWrite(jdoe, { graphUri: "http://data.exemple.org/source_2" })).toBe(false);
        expect(await sourceModel.canWrite(jdoe, { graphUri: "http://data.exemple.org/unknown" })).toBe(false);
    });

    test("canWrite lets an administrator write anywhere, read-only sources included", async () => {
        const admin = { login: "someone", groups: ["admin"] };
        expect(await sourceModel.canWrite(admin, { name: "SOURCE_2" })).toBe(true);
        expect(await sourceModel.canWrite(admin, { graphUri: "http://data.exemple.org/source_2" })).toBe(true);
        expect(await sourceModel.canWrite(admin, { graphUri: "http://data.exemple.org/unknown" })).toBe(true);
    });

    describe("owner rights: publication, update, deletion", () => {
        const publisher = { login: "jdoe", groups: ["publisher"] };
        const publisherProfile = {
            id: "5",
            label: "publisher",
            allowed_tools: ["lineage"],
            allowed_databases: [],
            is_shared: true,
            access_control: {
                "OWL/FOLDER_1": "readwrite",
                "OWL/EMPTY_GROUP": "readwrite",
                "OWL/PRIVATE": "readwrite",
                "OWL/FOLDER_2/SUBFOLDER_1/SOURCE_3": "readwrite",
                "SKOS/FOLDER_2": "readwrite",
            },
            schema_types: ["OWL", "SKOS"],
        };
        let publicationSourcesPath;
        let publicationSourceModel;

        beforeEach(async () => {
            tracker.on.select("profiles_list").response([...dbProfiles, publisherProfile]);
            const privateSource = { ...sourcesFromFiles["SOURCE_3"], name: "SOURCE_4", id: "SOURCE_4", group: "PRIVATE/jdoe", owner: "jdoe", published: false };
            const publicationSources = { ...sourcesFromFiles, SOURCE_4: privateSource };
            const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sources-"));
            publicationSourcesPath = path.join(temporaryDirectory, "sources.json");
            await fs.promises.writeFile(publicationSourcesPath, JSON.stringify(publicationSources));
            publicationSourceModel = new SourceModel(PROFILE_MODEL, publicationSourcesPath);
        });

        test("publishable groups are the readwrite groups of the schema type, named by sources or by profiles, never private", async () => {
            const groups = await publicationSourceModel.getPublishableGroups(publisher, "SOURCE_4");
            expect(groups).toStrictEqual(["EMPTY_GROUP", "FOLDER_1", "FOLDER_1/SUBFOLDER_1", "FOLDER_1/SUBFOLDER_2"]);
        });

        test("an administrator can publish into every non private group of the sources", async () => {
            const groups = await publicationSourceModel.getPublishableGroups({ login: "admin" }, "SOURCE_4");
            expect(groups).toStrictEqual(["FOLDER_1/SUBFOLDER_1", "FOLDER_1/SUBFOLDER_2", "FOLDER_2/SUBFOLDER_1"]);
        });

        test("only the owner can publish a source", async () => {
            await expect(publicationSourceModel.getPublishableGroups(publisher, "SOURCE_3")).rejects.toMatchObject({ status: 403 });
            await expect(publicationSourceModel.getPublishableGroups(publisher, "UNKNOWN")).rejects.toMatchObject({ status: 404 });
        });

        test("publishing refuses a group without readwrite right", async () => {
            await expect(publicationSourceModel.publishSource(publisher, "SOURCE_4", "FOLDER_2/SUBFOLDER_1")).rejects.toMatchObject({ status: 403 });
        });

        test("a non owner can neither update nor delete a source", async () => {
            const hijackedSource = { ...sourcesFromFiles["SOURCE_3"], owner: "jdoe" };
            await expect(publicationSourceModel.updateUserSource(publisher, hijackedSource)).rejects.toMatchObject({ status: 403 });
            await expect(publicationSourceModel.deleteUserSource(publisher, "SOURCE_3")).rejects.toMatchObject({ status: 403 });
            const writtenSources = JSON.parse(await fs.promises.readFile(publicationSourcesPath, "utf8"));
            expect(writtenSources["SOURCE_3"]).toStrictEqual(sourcesFromFiles["SOURCE_3"]);
        });

        test("an owner update keeps the stored access fields and applies the others", async () => {
            const storedSource = { ...sourcesFromFiles["SOURCE_3"], name: "SOURCE_4", id: "SOURCE_4", group: "PRIVATE/jdoe", owner: "jdoe", published: false };
            const updatedSource = {
                ...storedSource,
                owner: "someone",
                published: true,
                group: "FOLDER_2/SUBFOLDER_1",
                editable: !storedSource.editable,
                graphUri: "http://other.org/",
                imports: ["SOURCE_1"],
            };
            expect(await publicationSourceModel.updateUserSource(publisher, updatedSource)).toBe(true);
            const writtenSources = JSON.parse(await fs.promises.readFile(publicationSourcesPath, "utf8"));
            expect(writtenSources["SOURCE_4"]).toStrictEqual({ ...storedSource, graphUri: "http://other.org/", imports: ["SOURCE_1"] });
        });

        test("an owner cannot move its source onto a graph another source declares", async () => {
            const storedSource = { ...sourcesFromFiles["SOURCE_3"], name: "SOURCE_4", id: "SOURCE_4", group: "PRIVATE/jdoe", owner: "jdoe", published: false };
            const updatedSource = { ...storedSource, graphUri: sourcesFromFiles["SOURCE_1"].graphUri };
            await expect(publicationSourceModel.updateUserSource(publisher, updatedSource)).rejects.toMatchObject({ status: 409 });
        });

        test("a non admin cannot create a source on a graph another source declares, an admin can", async () => {
            const newSource = { ...sourcesFromFiles["SOURCE_1"], name: "SOURCE_5", id: "SOURCE_5", owner: "jdoe" };
            await expect(publicationSourceModel.addUserSource(publisher, newSource)).rejects.toMatchObject({ status: 409 });
            await publicationSourceModel.addUserSource(publisher, { ...newSource, graphUri: "http://free.org/" });
            await publicationSourceModel.addUserSource({ login: "admin" }, { ...newSource, name: "SOURCE_6", id: "SOURCE_6" });
            const writtenSources = JSON.parse(await fs.promises.readFile(publicationSourcesPath, "utf8"));
            expect(writtenSources["SOURCE_5"].graphUri).toStrictEqual("http://free.org/");
            expect(writtenSources["SOURCE_6"].graphUri).toStrictEqual(sourcesFromFiles["SOURCE_1"].graphUri);
        });

        test("a non admin creates a private unpublished source it owns, an admin keeps its descriptor", async () => {
            const newSource = { ...sourcesFromFiles["SOURCE_1"], name: "SOURCE_5", id: "SOURCE_5", graphUri: "http://free.org/", owner: "someone", published: true };
            await publicationSourceModel.addUserSource(publisher, newSource);
            await publicationSourceModel.addUserSource({ login: "admin" }, { ...newSource, name: "SOURCE_6", id: "SOURCE_6", graphUri: "http://free-too.org/" });
            const writtenSources = JSON.parse(await fs.promises.readFile(publicationSourcesPath, "utf8"));
            expect(writtenSources["SOURCE_5"]).toMatchObject({ owner: "jdoe", published: false, group: "PRIVATE/jdoe" });
            expect(writtenSources["SOURCE_6"]).toMatchObject({ owner: "someone", published: true, group: sourcesFromFiles["SOURCE_1"].group });
        });

        test("an update cannot overwrite another source through the id field", async () => {
            const redirectedSource = { ...sourcesFromFiles["SOURCE_3"], name: "SOURCE_4", id: "SOURCE_3" };
            await expect(publicationSourceModel.updateUserSource(publisher, redirectedSource)).rejects.toMatchObject({ status: 403 });
        });

        test("an owner can delete its source, an admin any source", async () => {
            expect(await publicationSourceModel.deleteUserSource(publisher, "SOURCE_4")).toBe(true);
            expect(await publicationSourceModel.deleteUserSource({ login: "admin" }, "SOURCE_3")).toBe(true);
            const writtenSources = JSON.parse(await fs.promises.readFile(publicationSourcesPath, "utf8"));
            expect(Object.keys(writtenSources)).toStrictEqual(["SOURCE_1", "SOURCE_2"]);
        });

        test("publishing moves the source into the group and marks it published", async () => {
            await publicationSourceModel.publishSource(publisher, "SOURCE_4", "EMPTY_GROUP");
            const writtenSources = JSON.parse(await fs.promises.readFile(publicationSourcesPath, "utf8"));
            expect(writtenSources["SOURCE_4"].group).toStrictEqual("EMPTY_GROUP");
            expect(writtenSources["SOURCE_4"].published).toBe(true);
        });
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
