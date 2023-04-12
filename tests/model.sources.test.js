const fs = require("fs");
const { SourceModel } = require("../model/sources");
const path = require("path");

describe("SourceModel", () => {
    /**
     * @type {SourceModel}
     */

    let sourceModel;
    beforeAll(() => {
        sourceModel = new SourceModel(path.join(__dirname, "data/config/sources.json"));
    });

    test("Can create instance", async () => {
        new SourceModel(path.join(__dirname, "data/config/sources.json"));
    });

    test("Can get all sources with readwrite access if user is admin", async () => {
        const admin = {
            login: "admin",
        };
        const sources = await sourceModel.getUserSources(admin);
        const sourcesFromFiles = await fs.promises.readFile(path.join(__dirname, "data/config/sources.json")).then((data) => JSON.parse(data.toString()));
        const expectedResult = Object.fromEntries(
            Object.entries(sourcesFromFiles).map(([id, source]) => {
                source.accessControl = "readwrite";
                return [id, source];
            })
        );
        expect(sources).toStrictEqual(expectedResult);
    });
});
