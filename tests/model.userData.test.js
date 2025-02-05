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
  let dbUserData;

  beforeAll(() => {
    tracker = createTracker(getKnexConnection);

    dbUserData = JSON.parse(fs.readFileSync(
      path.join(__dirname, "data", "config", "users", "userData.json")
    ));
  });

  afterEach(() => {
    tracker.reset();
  });

  test("get unshared userData", async () => {
    tracker.on.select("user_data_list").response(dbUserData);
    const adminUser = {login: "test", groups: []};
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
        "owned_by": "test"
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
        "owned_by": "test"
      }
    ])
  });

  test("get userData with shared user", async () => {
    tracker.on.select("user_data_list").response(dbUserData);
    const user = {login: "owl_user", groups: []};
    const userData = await userDataModel.all(user);
    for (const ud of userData) {
      if (ud.owned_by !== user.login) {
        expect(ud.shared_users).toContain(user.login);
      }
    }
  });

  test("get userData with shared user and shared profile", async () => {
    tracker.on.select("user_data_list").response(dbUserData);
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
    tracker.on.select("user_data_list").response(dbUserData);
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
});
