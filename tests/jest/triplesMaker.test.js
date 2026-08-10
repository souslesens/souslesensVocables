const { default: TriplesMaker } = await import("../../bin/KGbuilder/triplesMaker.js");
const { default: csvCrawler } = await import("../../bin/_csvCrawler.js");
const { databaseModel } = await import("../../model/databases.js");
const { default: KGbuilder_socket } = await import("../../bin/KGbuilder/KGbuilder_socket.js");
const { default: KGbuilder_triplesWriter } = await import("../../bin/KGbuilder/KGbuilder_triplesWriter.js");

const originals = {
    csvCrawlerGen: csvCrawler.readCsvBatchGenerator,
    dbGetUserConnection: databaseModel.getUserConnection,
    dbBatchSelectGenerator: databaseModel.batchSelectGenerator,
    socketMessage: KGbuilder_socket.message,
    writerWriteAsync: KGbuilder_triplesWriter.writeTriplesAsync,
    buildTriplesAsync: TriplesMaker.buildTriplesAsync,
    tableColumnsSelect: TriplesMaker.tableColumnsSelect,
};

afterEach(() => {
    csvCrawler.readCsvBatchGenerator = originals.csvCrawlerGen;
    databaseModel.getUserConnection = originals.dbGetUserConnection;
    databaseModel.batchSelectGenerator = originals.dbBatchSelectGenerator;
    KGbuilder_socket.message = originals.socketMessage;
    KGbuilder_triplesWriter.writeTriplesAsync = originals.writerWriteAsync;
    TriplesMaker.buildTriplesAsync = originals.buildTriplesAsync;
    TriplesMaker.tableColumnsSelect = originals.tableColumnsSelect;
});

function makeTableProcessingParams(tableInfosOverrides) {
    return {
        tableInfos: { table: "testTable", tableTotalRecords: 100, ...tableInfosOverrides },
        sourceInfos: { graphUri: "http://test/graph", sparqlServerUrl: "http://test/sparql" },
        tableColumnsMappings: {},
        uniqueTriplesMap: {},
    };
}

function runReadAndProcessData(tableProcessingParams, options) {
    return new Promise((resolve, reject) => {
        TriplesMaker.readAndProcessData("user", tableProcessingParams, options, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

function asyncGeneratorFromBatches(batches) {
    return async function* () {
        for (const batch of batches) {
            yield batch;
        }
    };
}

function fakeBuildTriples(data) {
    return data.map((row) => `<urn:s${row.id || row.a}> <urn:p> <urn:o${row.id || row.a}>`);
}

describe("TriplesMaker.readAndProcessData", () => {
    beforeEach(() => {
        KGbuilder_socket.message = function () {};
    });

    describe("CSV path", () => {
        function mockCsvGenerator(batches) {
            csvCrawler.readCsvBatchGenerator = asyncGeneratorFromBatches(batches);
        }

        test("sample mode returns triples from first batch only", async () => {
            mockCsvGenerator([[{ a: "1" }, { a: "2" }], [{ a: "3" }]]);
            TriplesMaker.buildTriplesAsync = async (data) => fakeBuildTriples(data);

            const result = await runReadAndProcessData(makeTableProcessingParams({ csvDataFilePath: "/fake.csv", tableTotalRecords: 3 }), { sampleSize: 2 });

            expect(result.sampleTriples).toHaveLength(2);
            expect(result.totalTriplesCount).toBe(0);
        });

        test("export mode accumulates all triples", async () => {
            mockCsvGenerator([[{ a: "1" }, { a: "2" }], [{ a: "3" }]]);
            TriplesMaker.buildTriplesAsync = async (data) => fakeBuildTriples(data);

            const result = await runReadAndProcessData(makeTableProcessingParams({ csvDataFilePath: "/fake.csv", tableTotalRecords: 3 }), { exportOnly: true });

            expect(result.exportTriples).toHaveLength(3);
            expect(result.totalTriplesCount).toBe(3);
        });

        test("write mode calls writeTriplesAsync per batch", async () => {
            mockCsvGenerator([[{ a: "1" }, { a: "2" }], [{ a: "3" }]]);
            TriplesMaker.buildTriplesAsync = async (data) => fakeBuildTriples(data);
            const writeCalls = [];
            KGbuilder_triplesWriter.writeTriplesAsync = async (triples) => {
                writeCalls.push([...triples]);
                return triples.length;
            };

            const result = await runReadAndProcessData(makeTableProcessingParams({ csvDataFilePath: "/fake.csv", tableTotalRecords: 3 }), {});

            expect(writeCalls).toHaveLength(2);
            expect(writeCalls[0]).toHaveLength(2);
            expect(writeCalls[1]).toHaveLength(1);
            expect(result.totalTriplesCount).toBe(3);
        });

        test("ntExportLimitReached skips all batches", async () => {
            mockCsvGenerator([[{ a: "1" }], [{ a: "2" }]]);
            TriplesMaker.buildTriplesAsync = async (data) => fakeBuildTriples(data);

            const result = await runReadAndProcessData(makeTableProcessingParams({ csvDataFilePath: "/fake.csv", tableTotalRecords: 2 }), { exportOnly: true, ntExportLimitReached: true });

            expect(result.exportTriples).toHaveLength(0);
            expect(result.totalTriplesCount).toBe(0);
        });

        test("export mode with onTriplesBatch callback", async () => {
            mockCsvGenerator([[{ a: "1" }], [{ a: "2" }]]);
            TriplesMaker.buildTriplesAsync = async (data) => fakeBuildTriples(data);
            const collected = [];
            const onTriplesBatch = (triples, cb) => {
                collected.push(...triples);
                cb();
            };

            await runReadAndProcessData(makeTableProcessingParams({ csvDataFilePath: "/fake.csv", tableTotalRecords: 2 }), { exportOnly: true, onTriplesBatch });

            expect(collected).toHaveLength(2);
        });
    });

    describe("DB path", () => {
        function mockDbGenerator(batches) {
            databaseModel.getUserConnection = async () => ({});
            databaseModel.batchSelectGenerator = asyncGeneratorFromBatches(batches);
            TriplesMaker.tableColumnsSelect = () => ["id"];
        }

        test("export mode accumulates triples from DB batches", async () => {
            mockDbGenerator([[{ id: "1" }, { id: "2" }], [{ id: "3" }]]);
            TriplesMaker.buildTriplesAsync = async (data) => fakeBuildTriples(data);

            const result = await runReadAndProcessData(makeTableProcessingParams({ dbID: "testDb", tableTotalRecords: 3 }), { exportOnly: true });

            expect(result.exportTriples).toHaveLength(3);
            expect(result.totalTriplesCount).toBe(3);
        });

        test("sample mode returns triples from first DB batch", async () => {
            mockDbGenerator([[{ id: "1" }, { id: "2" }], [{ id: "3" }]]);
            TriplesMaker.buildTriplesAsync = async (data) => fakeBuildTriples(data);

            const result = await runReadAndProcessData(makeTableProcessingParams({ dbID: "testDb", tableTotalRecords: 3 }), { sampleSize: 2 });

            expect(result.sampleTriples).toHaveLength(2);
        });

        test("write mode writes triples from DB batches", async () => {
            mockDbGenerator([[{ id: "1" }, { id: "2" }], [{ id: "3" }]]);
            TriplesMaker.buildTriplesAsync = async (data) => fakeBuildTriples(data);
            let totalWritten = 0;
            KGbuilder_triplesWriter.writeTriplesAsync = async (triples) => {
                totalWritten += triples.length;
                return triples.length;
            };

            const result = await runReadAndProcessData(makeTableProcessingParams({ dbID: "testDb", tableTotalRecords: 3 }), {});

            expect(totalWritten).toBe(3);
            expect(result.totalTriplesCount).toBe(3);
        });
    });

    describe("error handling", () => {
        test("propagates build error to callback", async () => {
            csvCrawler.readCsvBatchGenerator = asyncGeneratorFromBatches([[{ a: "1" }]]);
            TriplesMaker.buildTriplesAsync = async () => {
                throw new Error("build failed");
            };

            await expect(runReadAndProcessData(makeTableProcessingParams({ csvDataFilePath: "/fake.csv", tableTotalRecords: 1 }), { exportOnly: true })).rejects.toThrow("build failed");
        });

        test("returns error when no datasource configured", async () => {
            await expect(runReadAndProcessData(makeTableProcessingParams({}), {})).rejects.toBe("no datasource");
        });
    });
});
