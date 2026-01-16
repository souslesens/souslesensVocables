import { convertType, chunk, cleanupConnection, getKnexConnection, redoIfFailure } from "../model/utils.js";

describe("redoIfFailure", () => {
    test("redo", async () => {
        let ntry = 0;
        const noThrowAtThirdCall = () => {
            ntry += 1;
            if (ntry <= 3) {
                throw `Throw error at call ${ntry}`;
            }
        };

        redoIfFailure(noThrowAtThirdCall, 4, 0.1);
    });
});

describe("convertTypeUtils", () => {
    test("Convert string to boolean", async () => {
        expect(convertType("false")).toStrictEqual(false);
        expect(convertType("true")).toStrictEqual(true);
        expect(convertType("truetrue")).toStrictEqual("truetrue");
    });

    test("Convert string to number", async () => {
        expect(convertType("42")).toStrictEqual(42);
        expect(convertType("-7")).toStrictEqual(-7);
        expect(convertType("+0")).toStrictEqual(0);
    });

    test("Convert string to float", async () => {
        expect(convertType("13.37")).toStrictEqual(13.37);
        expect(convertType("-42.")).toStrictEqual(-42.0);
        expect(convertType("314e-2")).toStrictEqual(3.14);
        expect(convertType("0.0314E+2")).toStrictEqual(3.14);
        expect(convertType("-1.7976931348623159e+308")).toStrictEqual(-Infinity);
    });

    test("Do not convert non-string values", async () => {
        expect(convertType(false)).toStrictEqual(false);
        expect(convertType(42)).toStrictEqual(42);
        expect(convertType(13.37)).toStrictEqual(13.37);
    });
});

describe("chunkUtils", () => {
    test("Chunk list of 4 element in 2", async () => {
        expect(chunk([1, 2, 3, 4], 2)).toStrictEqual([
            [1, 2],
            [3, 4],
        ]);
    });
    test("Chunk list of 5 element in 2", async () => {
        expect(chunk([1, 2, 3, 4, 5], 2)).toStrictEqual([[1, 2], [3, 4], [5]]);
    });
    test("Chunk list of 4 element in 10", async () => {
        expect(chunk([1, 2, 3, 4], 10)).toStrictEqual([[1, 2, 3, 4]]);
    });
    test("Chunk list of 4 element in 0", async () => {
        expect(chunk([1, 2, 3, 4], 0)).toStrictEqual([[1, 2, 3, 4]]);
    });
    test("Chunk list of 4 element in -1", async () => {
        expect(chunk([1, 2, 3, 4], -1)).toStrictEqual([[1, 2, 3, 4]]);
    });
});

describe("knex functions", () => {
    test("get a false knex connection", async () => {
        const connection = getKnexConnection({});
        expect(connection.client).toBeDefined();
    });

    test("destroy the knex connection", async () => {
        const connection = { destroy: jest.fn() };
        cleanupConnection(connection);
        expect(connection.destroy).toHaveBeenCalled();
    });
});
