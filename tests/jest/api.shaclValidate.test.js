import { describe, test, expect } from "@jest/globals";
import shaclValidateRoute from "../../api/v1/paths/shaclValidate.js";

function bodyParamSchema(apiDoc) {
    const bodyParam = (apiDoc.parameters || []).find((p) => p.in === "body");
    return bodyParam && bodyParam.schema;
}

describe("shaclValidate route", () => {
    test("exposes only POST", () => {
        const operations = shaclValidateRoute();
        expect(Object.keys(operations)).toEqual(["POST"]);
    });

    test("POST apiDoc declares required body params", () => {
        const operations = shaclValidateRoute();
        const schema = bodyParamSchema(operations.POST.apiDoc);
        expect(schema).toBeDefined();
        expect(schema.required).toEqual(expect.arrayContaining(["triples", "shapes"]));
    });

    test("POST apiDoc documents 400 and 500 responses", () => {
        const operations = shaclValidateRoute();
        expect(Object.keys(operations.POST.apiDoc.responses)).toEqual(expect.arrayContaining(["400", "500"]));
    });
});
