import bcrypt from "bcrypt";
import fs from "fs";
import os from "os";
import path from "path";
import tmp from "tmp";
import { fileURLToPath } from "url";

import { cleanupConnection, getKnexConnection } from "../model/utils.js";
import { UserDataModel } from "../model/userData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

jest.mock("../model/utils.js");

describe("UserDataModel", () => {
    let temporaryDirectory;
    let userDataModel;

    beforeEach(() => {
        // Hide the console methods from the checking function
        jest.spyOn(console, "error").mockImplementation(() => {});

        temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "sls-"));
        fs.mkdirSync(path.join(temporaryDirectory, "user_data"));

        userDataModel = new UserDataModel(temporaryDirectory);
    });

    afterEach(() => {
        if (fs.existsSync(temporaryDirectory)) {
            fs.rmSync(temporaryDirectory, { recursive: true, force: true });
        }
    });

    test("get unshared userData", async () => {
        const adminUser = { id: "1", login: "admin", groups: [] };
        const userData = await userDataModel.all(adminUser);
        expect(Array.from(userData).length).toBe(2);
        expect(userData).toStrictEqual([
            {
                id: 1,
                data_type: "",
                data_source: "",
                data_tool: "",
                data_label: "data1",
                data_comment: "",
                data_group: "",
                is_shared: false,
                modification_date: "2025-01-24T14:16:41.111Z",
                shared_profiles: [],
                shared_users: [],
                created_at: "2025-01-24T14:16:41.111Z",
                readwrite: false,
                owned_by: 1,
            },
            {
                id: 5,
                data_type: "string",
                data_source: "source",
                data_tool: "tool",
                data_label: "",
                data_comment: "",
                data_group: "",
                is_shared: false,
                modification_date: "2025-01-27T08:05:51.750Z",
                shared_profiles: [],
                shared_users: ["owl_user", "skos_user"],
                created_at: "2025-01-27T08:05:51.750Z",
                readwrite: false,
                owned_by: 1,
            },
        ]);
    });

    test("get userData with shared user", async () => {
        const user = { login: "owl_user", groups: [] };
        const userData = await userDataModel.all(user);
        for (const ud of userData) {
            if (ud.owned_by !== user.login) {
                expect(ud.shared_users).toContain(user.login);
            }
        }
    });

    test("get userData with shared user and shared profile", async () => {
        const user = { login: "skos_user", groups: ["skos_only"] };
        const userData = await userDataModel.all(user);
        for (const ud of userData) {
            if (ud.owned_by !== user.login) {
                if (!ud.shared_users.includes(user.login)) {
                    expect(ud.shared_profiles).toStrictEqual(user.groups);
                }
            }
        }
    });

    test("get userData with shared user and shared profiles", async () => {
        const user = { login: "skos_user", groups: ["skos_only", "owl_only"] };
        const userData = await userDataModel.all(user);
        for (const ud of userData) {
            if (ud.owned_by !== user.login) {
                if (!ud.shared_users.includes(user.login)) {
                    let is_shared_by_profile = false;
                    for (const group of user.groups) {
                        if (ud.shared_profiles.includes(group)) {
                            is_shared_by_profile = true;
                        }
                    }
                    expect(is_shared_by_profile).toBeTruthy();
                }
            }
        }
    });

    test("get file (database)", async () => {
        userDataModel._mainConfig.userData.location = "database";
        expect(async () => await userDataModel.file(1)).rejects.toThrow();
    });

    test("get file from unknown identifier", async () => {
        userDataModel._mainConfig.userData.location = "file";
        expect(async () => await userDataModel.file(10, { login: "admin" })).rejects.toThrow();
    });

    test("get file from unknown user", async () => {
        userDataModel._mainConfig.userData.location = "file";
        expect(async () => await userDataModel.file(1, { login: "someone" })).rejects.toThrow();
    });

    test("get file for owner", async () => {
        userDataModel._mainConfig.userData.location = "file";
        const data = { test: "hello" };

        const filePath = path.join(temporaryDirectory, "user_data", "1-1-xxx.json");
        fs.writeFileSync(filePath, JSON.stringify(data));

        const result = await userDataModel.file(1, { login: "admin" });
        expect(result).toStrictEqual(data);
    });

    test("get file for unauthorized user", async () => {
        userDataModel._mainConfig.userData.location = "file";
        const filePath = path.join(temporaryDirectory, "user_data", "1-1-xxx.json");
        fs.writeFileSync(filePath, JSON.stringify({ test: "hello" }));

        expect(async () => await userDataModel.file(1, { login: "skos_user" })).rejects.toThrow();
    });

    test("get file with shared flag", async () => {
        userDataModel._mainConfig.userData.location = "file";
        const data = { test: "hello" };

        const filePath = path.join(temporaryDirectory, "user_data", "3-2-xxx.json");
        fs.writeFileSync(filePath, JSON.stringify(data));

        const result = await userDataModel.file(3, { login: "skos_user" });
        expect(result).toStrictEqual(data);
    });

    test("get file with unknown path", async () => {
        userDataModel._mainConfig.userData.location = "file";
        const result = await userDataModel.file(1, { login: "admin" });
        expect(result).toStrictEqual({});
    });

    test("get find userData", async () => {
        const data = { test: "hello" };
        const filePath = path.join(temporaryDirectory, "user_data", "1-1-xxx.json");
        fs.writeFileSync(filePath, JSON.stringify(data));

        const user = { id: "1", login: "admin", groups: ["admin"] };
        const userData = await userDataModel.find(1, user);
        expect(userData).toBeTruthy();
    });

    test("find userData with unknown identifier", async () => {
        const user = { id: "1", login: "admin", groups: ["admin"] };
        expect(async () => await userDataModel.find(10, user)).rejects.toThrow();
    });

    test("insert userData (file)", async () => {
        userDataModel._mainConfig.userData.location = "file";
        const addUserData = {
            data_type: "data_type",
            data_content: { test: "some content" },
            owned_by: 3,
        };
        const results = await userDataModel.insert(addUserData);
        expect(results).toStrictEqual(6);

        const pattern = path.join(temporaryDirectory, "user_data", "6-3-*.json");
        expect(fs.globSync(pattern).length).toStrictEqual(1);
    });

    test("insert userData (database)", async () => {
        userDataModel._mainConfig.userData.location = "database";
        const addUserData = {
            data_type: "data_type",
            data_content: { test: "some content" },
            owned_by: 3,
        };
        const results = await userDataModel.insert(addUserData);
        expect(results).toStrictEqual(6);

        const pattern = path.join(temporaryDirectory, "user_data", "6-3-*.json");
        expect(fs.globSync(pattern).length).toStrictEqual(0);
    });

    test("insert userData with unknown owner", async () => {
        const addUserData = {
            data_type: "data_type",
            owned_by: 5,
        };
        expect(async () => await userDataModel.insert(addUserData)).rejects.toThrow();
    });

    test("insert userData with too large file (database)", async () => {
        userDataModel._mainConfig.userData = {
            location: "database",
            maximumFileSize: 4,
        };

        const addUserData = {
            data_type: "data_type",
            owned_by: 5,
        };
        expect(async () => await userDataModel.insert(addUserData)).rejects.toThrow("The specified content is too large for the database");
    });

    test("remove userData (database)", async () => {
        userDataModel._mainConfig.userData.location = "database";
        const result = await userDataModel.remove(1, { id: 1, login: "admin" });
        expect(result).toBeTruthy();
    });

    test("remove userData (file)", async () => {
        userDataModel._mainConfig.userData.location = "file";
        const filePath = path.join(temporaryDirectory, "user_data", "1-1-xxx.json");
        fs.writeFileSync(filePath, "test");

        expect(fs.existsSync(filePath)).toBeTruthy();
        const result = await userDataModel.remove(1, { id: 1, login: "admin" });
        expect(result).toBeTruthy();
        expect(fs.existsSync(filePath)).toBeFalsy();
    });

    test("remove userData with unknown identifier", async () => {
        expect(async () => await userDataModel.remove(10)).rejects.toThrow();
    });

    test("update userData (database)", async () => {
        userDataModel._mainConfig.userData.location = "database";
        const filePath = path.join(temporaryDirectory, "user_data", "4-3-xxx.json");

        const updateUserData = {
            id: 3,
            data_type: "data_type",
            data_content: { test: "test" },
            owned_by: 2,
        };

        expect(fs.existsSync(filePath)).toBeFalsy();
        const result = await userDataModel.update(updateUserData);
        expect(result).toBeTruthy();
        expect(fs.existsSync(filePath)).toBeFalsy();
    });

    test("update userData (file)", async () => {
        userDataModel._mainConfig.userData.location = "file";
        const filePath = path.join(temporaryDirectory, "user_data", "4-3-xxx.json");

        const updateUserData = {
            id: 4,
            data_type: "data_type",
            data_content: { test: "test" },
            owned_by: 3,
        };

        expect(fs.existsSync(filePath)).toBeFalsy();
        const result = await userDataModel.update(updateUserData);
        expect(result).toBeTruthy();
        expect(fs.existsSync(filePath)).toBeTruthy();
    });

    test("update userData with created_at attribute (database)", async () => {
        userDataModel._mainConfig.userData.location = "database";
        const updateUserData = {
            id: 3,
            data_type: "data_type",
            data_content: { test: "test" },
            created_at: "xxx",
            owned_by: 2,
        };

        const result = await userDataModel.update(updateUserData);
        expect(result).toBeTruthy();
    });

    test("update userData with unknown identifier", async () => {
        const updateUserData = {
            id: 10,
            data_type: "data_type",
            data_content: { test: "test" },
            owned_by: 2,
        };

        expect(async () => await userDataModel.update(updateUserData)).rejects.toThrow("The specified identifier do not exists");
    });

    test("update userData with unknown owner", async () => {
        const updateUserData = {
            id: 1,
            data_type: "data_type",
            data_content: { test: "test" },
            owned_by: 5,
        };

        expect(async () => await userDataModel.update(updateUserData)).rejects.toThrow("The specified owned_by do not exists");
    });

    test("update userData with too large file (database)", async () => {
        userDataModel._mainConfig.userData = {
            location: "database",
            maximumFileSize: 4,
        };

        const updateUserData = {
            id: 1,
            data_type: "data_type",
            data_content: { test: "test" },
            owned_by: 2,
        };

        expect(async () => await userDataModel.update(updateUserData)).rejects.toThrow("The specified content is too large for the database");
    });

    test("test _convertToJSON", async () => {
        const data = {
            data_content: '{"sparqlServerUrl": "string", "databaseSources": {}}',
            is_shared: 1,
            shared_profiles: "[]",
            shared_users: '["owl_user", "skos_user"]',
        };
        expect(userDataModel._convertToJSON(data)).toStrictEqual({
            data_content: {
                sparqlServerUrl: "string",
                databaseSources: {},
            },
            is_shared: true,
            readwrite: false,
            shared_profiles: [],
            shared_users: ["owl_user", "skos_user"],
        });
    });

    test("test _convertToJSON with correct values", async () => {
        const data = {
            data_content: { sparqlServerUrl: "string", databaseSources: {} },
            is_shared: true,
            readwrite: false,
            shared_profiles: [],
            shared_users: ["owl_user", "skos_user"],
        };
        expect(userDataModel._convertToJSON(data)).toStrictEqual(data);
    });

    test("test _convertToJSON without values", async () => {
        expect(userDataModel._convertToJSON({})).toStrictEqual({
            data_content: {},
            is_shared: false,
            readwrite: false,
            shared_profiles: [],
            shared_users: [],
        });
    });

    test("test _check", async () => {
        data = userDataModel._check({ data_type: "text", owned_by: 1 });
    });

    test("test _check with missing attributes", async () => {
        expect(() => userDataModel._check({})).toThrow();
        expect(() => userDataModel._check({ owned_by: 1 })).toThrow();
    });

    test("test _checkIdentifier", async () => {
        userDataModel._checkIdentifier(1);
    });

    test("test _checkIdentifier with wrong value", async () => {
        expect(() => userDataModel._checkIdentifier(-1)).toThrow();
        expect(() => userDataModel._checkIdentifier(0)).toThrow();
        expect(() => userDataModel._checkIdentifier("xxx")).toThrow();
    });

    test("test _getUser", async () => {
        const user = { login: "admin", groups: ["admin"] };
        expect(userDataModel._getUser(user)).toStrictEqual(user);
    });

    test("test _getUser with undefined user with authentication", async () => {
        expect(userDataModel._getUser(undefined)).toStrictEqual(undefined);
    });

    test("test _getUser with undefined user without authentication", async () => {
        userDataModel._mainConfig.auth = "disabled";
        expect(userDataModel._getUser(undefined)).toStrictEqual({ id: "1", login: "admin", groups: ["admin"] });
    });
});
