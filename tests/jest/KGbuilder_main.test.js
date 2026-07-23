import { Writable } from "stream";

const { default: KGbuilder_main } = await import("../../bin/KGbuilder/KGbuilder_main.js");

function createCapturingStream() {
    const chunks = [];
    const stream = new Writable({
        write(chunk, encoding, callback) {
            chunks.push(chunk.toString());
            callback();
        },
    });
    stream.getWritten = () => chunks.join("");
    return stream;
}

function fakeImportEmittingBatches(batches) {
    return function (user, source, datasource, tables, options, callback) {
        function next(batchIndex, err) {
            if (err) {
                return callback(err);
            }
            if (batchIndex >= batches.length) {
                return callback();
            }
            options.onTriplesBatch(batches[batchIndex], (batchErr) => next(batchIndex + 1, batchErr));
        }
        next(0);
    };
}

function streamTriplesFromCsvOrTableAsNt(options, stream) {
    return new Promise((resolve, reject) => {
        KGbuilder_main.streamTriplesFromCsvOrTableAsNt("user", "source", "datasource", ["table"], options, stream, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}

describe("KGbuilder_main.streamTriplesFromCsvOrTableAsNt triple cap", () => {
    const originalImportTriplesFromCsvOrTable = KGbuilder_main.importTriplesFromCsvOrTable;

    afterEach(() => {
        KGbuilder_main.importTriplesFromCsvOrTable = originalImportTriplesFromCsvOrTable;
    });

    test("streams every triple when no maxNtExportTriples cap is set", async () => {
        KGbuilder_main.importTriplesFromCsvOrTable = fakeImportEmittingBatches([["<urn:s1> <urn:p1> <urn:o1>", "<urn:s2> <urn:p2> <urn:o2>"], ["<urn:s3> <urn:p3> <urn:o3>"]]);

        const stream = createCapturingStream();
        await streamTriplesFromCsvOrTableAsNt({}, stream);

        const writtenTriplesCount = (stream.getWritten().match(/^<urn:/gm) || []).length;
        expect(writtenTriplesCount).toBe(3);
        expect(stream.getWritten()).not.toContain("truncated");
    });

    test("truncates the export at maxNtExportTriples and appends a truncation notice", async () => {
        KGbuilder_main.importTriplesFromCsvOrTable = fakeImportEmittingBatches([
            ["<urn:s1> <urn:p1> <urn:o1>", "<urn:s2> <urn:p2> <urn:o2>"],
            ["<urn:s3> <urn:p3> <urn:o3>", "<urn:s4> <urn:p4> <urn:o4>"],
        ]);

        const stream = createCapturingStream();
        await streamTriplesFromCsvOrTableAsNt({ maxNtExportTriples: 3 }, stream);

        const writtenTriplesCount = (stream.getWritten().match(/^<urn:/gm) || []).length;
        expect(writtenTriplesCount).toBe(3);
        expect(stream.getWritten()).toContain("# export truncated: reached profile export limit of 3 triples");
    });

    test("skips remaining batches once the cap has already been reached", async () => {
        const secondBatch = ["<urn:s3> <urn:p3> <urn:o3>"];
        let secondBatchWasWritten = false;
        KGbuilder_main.importTriplesFromCsvOrTable = fakeImportEmittingBatches([["<urn:s1> <urn:p1> <urn:o1>", "<urn:s2> <urn:p2> <urn:o2>"], secondBatch]);

        const stream = createCapturingStream();
        const originalWrite = stream.write.bind(stream);
        stream.write = (chunk, ...rest) => {
            if (chunk.includes("s3")) {
                secondBatchWasWritten = true;
            }
            return originalWrite(chunk, ...rest);
        };

        await streamTriplesFromCsvOrTableAsNt({ maxNtExportTriples: 2 }, stream);

        expect(secondBatchWasWritten).toBe(false);
    });
});
