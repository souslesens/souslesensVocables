import TriplesMaker from "../bin/KGbuilder/triplesMaker.js";

describe("TriplesMaker report", () => {
    function makeParams(report) {
        return {
            tableColumnsMappings: {},
            columnToColumnEdgesMap: {},
            uniqueTriplesMap: {},
            allColumnsMappings: {},
            jsFunctionsMap: {},
            sourceInfos: { graphUri: "http://example.org/graph" },
            tableInfos: { table: "test_table" },
            isSampleData: false,
            randomIdentiersMap: {},
            blankNodesMap: {},
            report: report,
        };
    }

    test("report is null when not provided", (done) => {
        var params = makeParams(null);
        TriplesMaker.buildTriples([], params, { currentBatchRowIndex: 0 }, function (err, triples) {
            expect(err).toBeNull();
            expect(triples).toEqual([]);
            done();
        });
    });

    test("records skipped mapping when column URI is null", (done) => {
        var report = { table: "test_table", skippedMappings: [], errors: [], skippedMappingsTruncated: false, errorsTruncated: false };
        var params = makeParams(report);
        params.tableColumnsMappings = {
            colA: {
                id: "missing_col",
                type: "Column",
                uriType: "fromLabel",
                baseURI: "http://example.org/",
                mappings: [],
            },
        };

        var data = [{ other_col: "value" }];
        TriplesMaker.buildTriples(data, params, { currentBatchRowIndex: 0 }, function (err, triples) {
            expect(err).toBeNull();
            expect(report.skippedMappings.length).toBeGreaterThan(0);
            expect(report.skippedMappings[0].reason).toBe("null_column_uri");
            expect(report.skippedMappings[0].rowIndex).toBe(0);
            done();
        });
    });

    test("records error when transform function throws", (done) => {
        var report = { table: "test_table", skippedMappings: [], errors: [], skippedMappingsTruncated: false, errorsTruncated: false };
        var params = makeParams(report);
        params.tableColumnsMappings = {
            colA: {
                id: "colA",
                type: "Column",
                uriType: "fromLabel",
                baseURI: "http://example.org/",
                mappings: [
                    {
                        s: "colA",
                        p: "http://example.org/prop",
                        o: "colA",
                        transform: true,
                    },
                ],
            },
        };
        params.jsFunctionsMap = {
            colA: function () {
                throw new Error("transform error");
            },
        };

        var data = [{ colA: "somevalue" }];
        TriplesMaker.buildTriples(data, params, { currentBatchRowIndex: 0 }, function (err, triples) {
            expect(err).toBeNull();
            expect(report.errors.length).toBe(1);
            expect(report.errors[0].error).toContain("transform error");
            expect(report.errors[0].rowIndex).toBe(0);
            done();
        });
    });

    test("no report entries on success", (done) => {
        var report = { table: "test_table", skippedMappings: [], errors: [], skippedMappingsTruncated: false, errorsTruncated: false };
        var params = makeParams(report);
        params.tableColumnsMappings = {
            colA: {
                id: "colA",
                type: "Column",
                uriType: "fromLabel",
                baseURI: "http://example.org/",
                mappings: [
                    {
                        s: "colA",
                        p: "http://example.org/prop",
                        o: "colA",
                        isString: true,
                    },
                ],
            },
        };

        var data = [{ colA: "hello" }];
        TriplesMaker.buildTriples(data, params, { currentBatchRowIndex: 0 }, function (err, triples) {
            expect(err).toBeNull();
            expect(triples.length).toBeGreaterThan(0);
            expect(report.errors.length).toBe(0);
            done();
        });
    });

    test("skippedMappingsTruncated flag set when over MAX_REPORT", (done) => {
        var report = { table: "test_table", skippedMappings: [], errors: [], skippedMappingsTruncated: false, errorsTruncated: false };
        var params = makeParams(report);
        params.tableColumnsMappings = {
            colA: {
                id: "missing_col",
                type: "Column",
                uriType: "fromLabel",
                baseURI: "http://example.org/",
                mappings: [],
            },
        };

        var data = new Array(600).fill(null).map(function (_, i) {
            return { other: "v" + i };
        });
        TriplesMaker.buildTriples(data, params, { currentBatchRowIndex: 0 }, function (err, triples) {
            expect(err).toBeNull();
            expect(report.skippedMappings.length).toBe(500);
            expect(report.skippedMappingsTruncated).toBe(true);
            done();
        });
    });
});
