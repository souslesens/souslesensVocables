const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const tmp = require("tmp");

const { createTracker, MockClient } = require("knex-mock-client");

const { cleanupConnection, getKnexConnection } = require("../model/utils");
const { userDataModel } = require("../model/userData");


jest.mock("../model/utils", () => {
    const knex = require("knex");
    return {
        cleanupConnection: jest.fn().mockReturnThis(),
        getKnexConnection: knex({ client: MockClient, dialect: "pg" }),
    };
});


describe("UserDataModel", () => {
    let tracker;
    let dbUsers;
    let dbUserDataList;

    beforeAll(() => {
        tracker = createTracker(getKnexConnection);
        dbUserDataList = JSON.parse(fs.readFileSync(
            path.join(__dirname, "data", "config", "users", "userData.list.json")
        ));
        dbUsers = JSON.parse(fs.readFileSync(
            path.join(__dirname, "data", "config", "users", "users.json")
        ));
        dbProfiles = JSON.parse(fs.readFileSync(
            path.join(__dirname, "data", "config", "profiles.json")
        ));
    });

    afterEach(() => {
        tracker.reset();
    });

    test("get unshared userData", async () => {
        tracker.on.select("user_data_list").response(dbUserDataList);
        const adminUser = {login: "admin", groups: []};
        const userData = await userDataModel.all(adminUser);
        expect(Array.from(userData).length).toBe(2);
        expect(userData).toStrictEqual([
            {
                "id": 1,
                "data_path": "data1",
                "data_type": "",
                "data_label": "data1",
                "data_comment": "",
                "data_group": "",
                "data_content": {
                    "sparqlServerUrl": "string",
                    "graphUri": "string",
                    "prefixes": {},
                    "lookups": {},
                    "databaseSources": {},
                    "cvsSources": {}
                },
                "is_shared": false,
                "shared_profiles": [],
                "shared_users": [],
                "created_at": "2025-01-24T14:16:41.111Z",
                "owned_by": "admin"
            },
            {
                "id": 5,
                "data_path": "shared with owl_user and skos_user users",
                "data_type": "string",
                "data_label": "",
                "data_comment": "",
                "data_group": "",
                "data_content": {
                    "sparqlServerUrl": "string",
                    "graphUri": "string",
                    "prefixes": {},
                    "lookups": {},
                    "databaseSources": {},
                    "cvsSources": {}
                },
                "is_shared": false,
                "shared_profiles": [],
                "shared_users": [
                    "owl_user",
                    "skos_user"
                ],
                "created_at": "2025-01-27T08:05:51.750Z",
                "owned_by": "admin"
            }
        ])
    });

    test("get userData with shared user", async () => {
        tracker.on.select("user_data_list").response(dbUserDataList);
        const user = {login: "owl_user", groups: []};
        const userData = await userDataModel.all(user);
        for (const ud of userData) {
            if (ud.owned_by !== user.login) {
                expect(ud.shared_users).toContain(user.login);
            }
        }
    });

    test("get userData with shared user and shared profile", async () => {
        tracker.on.select("user_data_list").response(dbUserDataList);
        const user = {login: "skos_user", groups: ["skos_only"]};
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
        tracker.on.select("user_data_list").response(dbUserDataList);
        const user = {login: "skos_user", groups: ["skos_only", "owl_only"]};
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

    test("find userData", async () => {
        tracker.on.select("user_data_list").response(dbUserDataList);
        const userData = await userDataModel.find(1);
        expect(userData).toBeTruthy();
    });

    test("insert userData", async () => {
        tracker.on.select("user_data_list").response(dbUserDataList);
        tracker.on.select("users").response(dbUsers);
        tracker.on.select("profiles").response(dbProfiles);
        tracker.on.insert("user_data").response([]);

        const addUserData = {
            data_path: "data_path",
            data_type: "data_type",
            owned_by: "test",
        }
        await userDataModel.insert(addUserData);

        const updatedUserData = Array.from(dbUserDataList);
        updatedUserData.push(addUserData);

        tracker.reset();
        tracker.on.select("user_data").response(updatedUserData);
        const userDatas = await userDataModel.all({login: "test", groups: []});
        expect(userDatas[0].owned_by).toStrictEqual("test");
    });

    test("remove userData", async () => {
        tracker.on.select("user_data").response(dbUserDataList);
        tracker.on.delete("user_data").response();
        const result = await userDataModel.remove(1);
        expect(result).toBeTruthy();
    });

    test("update userData", async () => {
        tracker.on.select("user_data").response(dbUserDataList);
        tracker.on.select("users").response(dbUsers);
        tracker.on.select("profiles").response(dbProfiles);
        tracker.on.update("user_data").response([]);

        const updateUserData = {
            id: 3,
            data_path: "update",
            data_type: "data_type",
            owned_by: "owl_user",
        };

        const result = await userDataModel.update(updateUserData);
        expect(result).toBeTruthy();
    });
});
