import { describe, test, expect, jest, beforeEach, afterEach } from "@jest/globals";

const getDatabaseMock = jest.fn();
const getClientDriverMock = jest.fn();
const getUserConnectionMock = jest.fn();
const getUserMock = jest.fn();
const getConnectionMock = jest.fn();
const getKGModelMock = jest.fn();
const getSampleDataMock = jest.fn();
const getDataMock = jest.fn();

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

const checkSqlSelectQueryMock = jest.fn();

jest.unstable_mockModule("../../bin/userRequestFiltering.js", () => ({
    default: { checkSqlSelectQuery: checkSqlSelectQueryMock },
}));

jest.unstable_mockModule("../../bin/databases/dbConnector.js", () => ({
    getConnection: getConnectionMock,
    getKGModel: getKGModelMock,
    getSampleData: getSampleDataMock,
    getData: getDataMock,
}));

const { default: modelRoute } = await import("../../api/v1/paths/databases/model.js");
const { default: dataRoute } = await import("../../api/v1/paths/kg/data.js");

function buildResponse() {
    const res = {
        status: jest.fn(),
        json: jest.fn(),
    };
    res.status.mockReturnValue(res);
    return res;
}

async function callModel(query) {
    const res = buildResponse();
    await modelRoute().GET({ query }, res);
    return res;
}

async function callData(query) {
    const res = buildResponse();
    await dataRoute().GET({ query }, res);
    return res;
}

describe("databases/model route schema parameter", () => {
    let consoleErrorSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        getDatabaseMock.mockResolvedValue({ id: "demo", driver: "postgres", database: "demo" });
        getClientDriverMock.mockResolvedValue({ driver: "postgres" });
        getConnectionMock.mockReturnValue({ connection: true });
        getKGModelMock.mockImplementation((_connection, _dbName, _driver, success) => success([]));
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    test("forwards the schema query value as the last connector argument", async () => {
        const res = await callModel({ name: "demo", schema: "staging" });

        expect(getKGModelMock.mock.calls[0][6]).toBe("staging");
        expect(getKGModelMock.mock.calls[0].length).toBe(7);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("forwards undefined when schema is absent", async () => {
        await callModel({ name: "demo" });

        expect(getKGModelMock.mock.calls[0][6]).toBeUndefined();
        expect(getKGModelMock.mock.calls[0].length).toBe(7);
    });

    test("apiDoc declares an optional schema query param", () => {
        const schemaParam = modelRoute().GET.apiDoc.parameters.find((p) => p.name === "schema");
        expect(schemaParam.in).toBe("query");
        expect(schemaParam.required).toBe(false);
    });
});

describe("kg/data route schema parameter", () => {
    let consoleErrorSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        getUserMock.mockResolvedValue({ user: { login: "xavier" } });
        getUserConnectionMock.mockResolvedValue({ connection: true });
        getDatabaseMock.mockResolvedValue({ id: "demo", driver: "postgres" });
        getClientDriverMock.mockResolvedValue({ driver: "postgres" });
        getSampleDataMock.mockResolvedValue([{ id: 1 }]);
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    test("forwards the schema query value to getSampleData", async () => {
        const res = await callData({ dbName: "demo", tableName: "assets", schema: "staging" });

        expect(getSampleDataMock).toHaveBeenCalledWith(expect.anything(), "assets", 200, expect.anything(), "staging");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ rows: [{ id: 1 }] });
    });

    test("forwards undefined when schema is absent", async () => {
        await callData({ dbName: "demo", tableName: "assets" });

        expect(getSampleDataMock.mock.calls[0][4]).toBeUndefined();
        expect(getSampleDataMock.mock.calls[0].length).toBe(5);
    });

    test("does not send the schema to getSampleData in sqlQuery mode", async () => {
        getDataMock.mockImplementation((_connection, _sqlQuery, success) => success({ rows: [] }));
        checkSqlSelectQueryMock.mockImplementation((_sqlQuery, _driver, callback) => callback(null));

        await callData({ dbName: "demo", sqlQuery: "SELECT 1", schema: "staging" });

        expect(getSampleDataMock).not.toHaveBeenCalled();
        expect(getDataMock).toHaveBeenCalledWith(expect.anything(), "SELECT 1", expect.any(Function), expect.any(Function));
    });

    test("apiDoc declares an optional schema query param", () => {
        const schemaParam = dataRoute().GET.apiDoc.parameters.find((p) => p.name === "schema");
        expect(schemaParam.in).toBe("query");
        expect(schemaParam.required).toBe(false);
    });
});
