import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const getDatabaseMock = jest.fn();
const getClientDriverMock = jest.fn();
const getUserConnectionMock = jest.fn();
const getUserMock = jest.fn();
const getSchemasMock = jest.fn();

jest.unstable_mockModule("../../model/databases.js", () => ({
    databaseModel: {
        getDatabase: getDatabaseMock,
        getClientDriver: getClientDriverMock,
        getUserConnection: getUserConnectionMock,
    },
}));

jest.unstable_mockModule("../../bin/user.js", () => ({
    default: { getUser: getUserMock },
}));

jest.unstable_mockModule("../../bin/databases/dbConnector.js", () => ({
    getSchemas: getSchemasMock,
}));

const { default: schemasRoute } = await import("../../api/v1/paths/kg/schemas.js");

function buildResponse() {
    const res = {
        status: jest.fn(),
        json: jest.fn(),
    };
    res.status.mockReturnValue(res);
    return res;
}

describe("kg/schemas route", () => {
    let consoleErrorSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
        jest.restoreAllMocks();
        getDatabaseMock.mockResolvedValue({ id: "demo", driver: "postgres" });
        getClientDriverMock.mockResolvedValue({ driver: "postgres" });
        getUserMock.mockResolvedValue({ user: { login: "xavier" } });
        getUserConnectionMock.mockResolvedValue({ connection: true });
        getSchemasMock.mockImplementation((_connection, _driver, success) => success([]));
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    async function callGet(query) {
        const operations = schemasRoute();
        const res = buildResponse();
        await operations.GET({ query }, res);
        return res;
    }

    test("answers 200 with the schemas when the connection succeeds", async () => {
        getSchemasMock.mockImplementation((_connection, _driver, success) => success(["public"]));

        const res = await callGet({ name: "demo" });

        expect(getDatabaseMock).toHaveBeenCalledWith("demo");
        expect(getUserConnectionMock).toHaveBeenCalledWith({ login: "xavier" }, "demo");
        expect(getSchemasMock).toHaveBeenCalledWith({ connection: true }, { driver: "postgres" }, expect.any(Function), expect.any(Function));
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ schemas: ["public"] });
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test("answers 503 when the connection is refused", async () => {
        getSchemasMock.mockImplementation((_connection, _driver, _success, failure) => failure(new Error("ECONNREFUSED")));

        const res = await callGet({ name: "demo" });

        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({ message: "The connection to the database was refused" });
    });

    test("answers 403 and never lists the schemas when the user is not allowed the database", async () => {
        const forbidden = new Error('Access to database "demo" is not allowed for this user');
        forbidden.status = 403;
        getUserConnectionMock.mockRejectedValue(forbidden);

        const res = await callGet({ name: "demo" });

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: forbidden.message });
        expect(getSchemasMock).not.toHaveBeenCalled();
    });

    test("answers 404 with the error message when getDatabase rejects with cause 404", async () => {
        getDatabaseMock.mockRejectedValue(new Error("The database cannot be found", { cause: 404 }));

        const res = await callGet({ name: "unknown" });

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "The database cannot be found" });

        expect(getSchemasMock).not.toHaveBeenCalled();
    });

    test("answers 500 when the introspection throws", async () => {
        getClientDriverMock.mockRejectedValue(new Error("unknown driver"));

        const res = await callGet({ name: "demo" });

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "unknown driver" });
    });

    test("exposes only GET", () => {
        const operations = schemasRoute();
        expect(Object.keys(operations)).toEqual(["GET"]);
    });

    test("GET apiDoc is tagged under KG", () => {
        const operations = schemasRoute();
        expect(operations.GET.apiDoc.tags).toEqual(["KG"]);
        expect(operations.GET.apiDoc.operationId).toBe("kgGetSchemas");
    });

    test("GET apiDoc declares a required name query param", () => {
        const operations = schemasRoute();
        const nameParam = operations.GET.apiDoc.parameters.find((p) => p.name === "name");
        expect(nameParam.in).toBe("query");
        expect(nameParam.required).toBe(true);
        expect(Object.keys(operations.GET.apiDoc.responses)).toEqual(expect.arrayContaining(["200", "403", "404", "500", "503"]));
    });
});
