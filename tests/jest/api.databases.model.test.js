import { describe, test, expect } from "@jest/globals";
import databaseModelRoute from "../../api/v1/paths/databases/model.js";

describe("databases/model route", () => {
    test("exposes only GET", () => {
        const operations = databaseModelRoute();
        expect(Object.keys(operations)).toEqual(["GET"]);
    });

    test("GET apiDoc is tagged under Databases", () => {
        const operations = databaseModelRoute();
        expect(operations.GET.apiDoc.tags).toEqual(["Databases"]);
        expect(operations.GET.apiDoc.operationId).toBe("getDatabaseModel");
    });

    test("GET apiDoc declares the name and withTypes query params", () => {
        const operations = databaseModelRoute();
        const params = operations.GET.apiDoc.parameters.map((p) => p.name);
        expect(params).toEqual(expect.arrayContaining(["name", "withTypes"]));
    });
});
