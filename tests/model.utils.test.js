const { convertType } = require("../model/utils");

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
        expect(convertType("-42.")).toStrictEqual(-42.00);
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
