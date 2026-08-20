import { jest } from "@jest/globals";
import { cleanupConnection as cleanupConnectionMock, getKnexConnection as getKnexConnectionMock } from "../../model/__mocks__/utils.js";

jest.unstable_mockModule("../../model/utils.js", () => ({ cleanupConnection: cleanupConnectionMock, getKnexConnection: getKnexConnectionMock }));

/* The store is stubbed: what matters here is the arithmetic between what was recorded
 * and what the graph still holds, not the SPARQL that measures it. */
const measures = { total: 0, mapping: 0 };
jest.unstable_mockModule("../../model/rdfData.js", () => ({
    rdfDataModel: {
        getTripleCount: async () => measures.total,
        execQuery: async () => [{ total: { value: `${measures.mapping}` } }],
    },
}));

const { cleanupConnection, getKnexConnection } = await import("../../model/utils.js");
const { TripleQuotaModel, MAPPING_KIND, UPLOAD_KIND } = await import("../../model/tripleQuota.js");

describe("TripleQuotaModel", () => {
    let quotaModel;
    let connection;
    const bucket = { kind: MAPPING_KIND, graphUri: "urn:g", table: "equipments" };

    beforeEach(async () => {
        /* The mock builds a fresh in-memory database on every call, so the model is
         * given one connection to keep: otherwise nothing it writes is ever read back. */
        connection = getKnexConnection({});
        await connection("user_data").where("data_type", "like", "sls:quota:%").del();
        quotaModel = new TripleQuotaModel(connection);
        measures.total = 0;
        measures.mapping = 0;
    });

    afterEach(() => {
        cleanupConnection(connection);
    });

    test("a user who never wrote anything holds nothing", async () => {
        expect(await quotaModel.usageFor("alice", MAPPING_KIND)).toBe(0);
    });

    test("a single contributor holds exactly what they poured in", async () => {
        await quotaModel.addShare("alice", bucket, 1000);
        measures.mapping = 1000;
        expect(await quotaModel.usageFor("alice", MAPPING_KIND)).toBe(1000);
    });

    test("a measured delta of zero adds nothing, as when a mapping is replayed", async () => {
        await quotaModel.addShare("alice", bucket, 1000);
        await quotaModel.addShare("bob", bucket, 0);
        measures.mapping = 1000;
        expect(await quotaModel.usageFor("bob", MAPPING_KIND)).toBe(0);
        expect(await quotaModel.usageFor("alice", MAPPING_KIND)).toBe(1000);
    });

    test("two contributors keep their own share while the bucket is intact", async () => {
        await quotaModel.addShare("alice", bucket, 750);
        await quotaModel.addShare("bob", bucket, 250);
        measures.mapping = 1000;
        expect(await quotaModel.usageFor("alice", MAPPING_KIND)).toBe(750);
        expect(await quotaModel.usageFor("bob", MAPPING_KIND)).toBe(250);
    });

    test("a deletion nobody could attribute is shared out in proportion", async () => {
        await quotaModel.addShare("alice", bucket, 750);
        await quotaModel.addShare("bob", bucket, 250);
        // Half the bucket was deleted by hand, through the SPARQL endpoint.
        measures.mapping = 500;
        expect(await quotaModel.usageFor("alice", MAPPING_KIND)).toBe(375);
        expect(await quotaModel.usageFor("bob", MAPPING_KIND)).toBe(125);
    });

    test("deleting part of a bucket costs the author exactly what disappeared", async () => {
        await quotaModel.addShare("alice", bucket, 45);
        // "delete specific triples" removed 15 of the 45, the record is left untouched.
        measures.mapping = 30;
        expect(await quotaModel.usageFor("alice", MAPPING_KIND)).toBe(30);
    });

    test("triples nobody recorded are charged to nobody", async () => {
        await quotaModel.addShare("alice", bucket, 1000);
        // The graph holds more than was ever recorded: written before this existed.
        measures.mapping = 5000;
        expect(await quotaModel.usageFor("alice", MAPPING_KIND)).toBe(1000);
    });

    test("an emptied bucket costs nothing", async () => {
        await quotaModel.addShare("alice", bucket, 1000);
        measures.mapping = 0;
        expect(await quotaModel.usageFor("alice", MAPPING_KIND)).toBe(0);
    });

    test("a deletion survives someone else writing into the same bucket", async () => {
        await quotaModel.addShare("alice", bucket, 65);
        // Alice deleted 20 of her triples, by hand or through the tool.
        measures.mapping = 45;
        expect(await quotaModel.usageFor("alice", MAPPING_KIND)).toBe(45);

        // Bob then imports 20 triples of his own into that same table.
        measures.mapping = 45;
        const sizes = await quotaModel.snapshot([bucket]);
        measures.mapping = 65;
        await quotaModel.recordSince("bob", [bucket], sizes);

        expect(await quotaModel.usageFor("alice", MAPPING_KIND)).toBe(45);
        expect(await quotaModel.usageFor("bob", MAPPING_KIND)).toBe(20);
    });

    test("resetting a bucket drops every contributor at once", async () => {
        await quotaModel.addShare("alice", bucket, 750);
        await quotaModel.addShare("bob", bucket, 250);
        await quotaModel.resetBucket(bucket);
        measures.mapping = 1000;
        expect(await quotaModel.usageFor("alice", MAPPING_KIND)).toBe(0);
        expect(await quotaModel.usageFor("bob", MAPPING_KIND)).toBe(0);
    });

    test("resetting the mapping buckets of a graph leaves the upload bucket alone", async () => {
        await quotaModel.addShare("alice", bucket, 1000);
        await quotaModel.addShare("alice", { kind: UPLOAD_KIND, graphUri: "urn:g" }, 300);
        await quotaModel.resetBucket({ kind: MAPPING_KIND, graphUri: "urn:g" });

        measures.total = 300;
        measures.mapping = 0;
        expect(await quotaModel.usageFor("alice", MAPPING_KIND)).toBe(0);
        expect(await quotaModel.usageFor("alice", UPLOAD_KIND)).toBe(300);
    });

    test("the upload bucket is what the graph holds minus what KGbuilder wrote", async () => {
        await quotaModel.addShare("alice", { kind: UPLOAD_KIND, graphUri: "urn:g" }, 400);
        measures.total = 1400;
        measures.mapping = 1000;
        expect(await quotaModel.usageFor("alice", UPLOAD_KIND)).toBe(400);
    });

    test("shares accumulate across writes into the same bucket", async () => {
        await quotaModel.addShare("alice", bucket, 400);
        await quotaModel.addShare("alice", bucket, 600);
        measures.mapping = 1000;
        expect(await quotaModel.usageFor("alice", MAPPING_KIND)).toBe(1000);
    });

    test("an undefined cap allows, a cap of 0 forbids without measuring", async () => {
        const uncapped = await quotaModel.checkAllowance("alice", MAPPING_KIND, undefined);
        expect(uncapped.allowed).toBe(true);

        const forbidden = await quotaModel.checkAllowance("alice", MAPPING_KIND, 0);
        expect(forbidden.allowed).toBe(false);
        expect(forbidden.cap).toBe(0);
    });

    test("a cap allows while under it and refuses once reached", async () => {
        await quotaModel.addShare("alice", bucket, 999);
        measures.mapping = 999;
        expect((await quotaModel.checkAllowance("alice", MAPPING_KIND, 1000)).allowed).toBe(true);

        await quotaModel.addShare("alice", bucket, 1);
        measures.mapping = 1000;
        quotaModel._measureCache.clear();
        expect((await quotaModel.checkAllowance("alice", MAPPING_KIND, 1000)).allowed).toBe(false);
    });
});
