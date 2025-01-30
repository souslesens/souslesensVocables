const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const tmp = require("tmp");

const { createTracker, MockClient } = require("knex-mock-client");

const { cleanupConnection, getKnexConnection } = require("../model/utils");
const { userModel } = require("../model/users");


jest.mock("../model/utils", () => {
    const knex = require("knex");
    return {
        cleanupConnection: jest.fn().mockReturnThis(),
        getKnexConnection: knex({ client: MockClient, dialect: "pg" }),
    };
});


describe("UserModelJson", () => {
    let tracker;
    let dbUsers;

    beforeAll(() => {
        tracker = createTracker(getKnexConnection);

        dbUsers = JSON.parse(fs.readFileSync(
            path.join(__dirname, "data", "config", "users", "users.json")
        ));
    });

    afterEach(() => {
        tracker.reset();
    });

    test("read the list of users with get()", async () => {
        tracker.on.select("public_users_list").response(dbUsers);

        const users = await userModel.getUserAccounts();
        expect(users).toStrictEqual({
            admin: {
                id: "1",
                login: "admin",
                password: "$2b$10$LhdaXF3tHrvA8b8fKMvNmeOSyogCBgN/L9XLN/vqjz6tgN5rSxMyy",
                token: "admin-token",
                groups: ["admin"],
                allowSourceCreation: false,
                maxNumberCreatedSource: 5,
                source: "database",
            },
            owl_user: {
                id: "2",
                login: "owl_user",
                password: "$2b$10$ed6ZDHUbN7NfOGrufiDniudK9EMLCFg9qFgJ0N/T.nRTBPlA5Mm9C",
                token: "owl-token",
                groups: ["owl_only"],
                allowSourceCreation: false,
                maxNumberCreatedSource: 5,
                source: "database",
            },
            skos_user: {
                id: "3",
                login: "skos_user",
                password: "",
                token: "skos-token",
                groups: ["skos_only"],
                allowSourceCreation: false,
                maxNumberCreatedSource: 5,
                source: "database",
            },
        });
    });

    test("find a user with findUserAccount()", async () => {
        tracker.on.select("users").response(dbUsers[0]);

        const user = await userModel.findUserAccount("admin");
        expect(user).toStrictEqual([
            "admin",
            {
                id: "1",
                login: "admin",
                password: "$2b$10$LhdaXF3tHrvA8b8fKMvNmeOSyogCBgN/L9XLN/vqjz6tgN5rSxMyy",
                groups: ["admin"],
                source: "database",
                token: "admin-token",
                allowSourceCreation: false,
                maxNumberCreatedSource: 5,
            }
        ]);
    });

    test("fail to find a user with findUserAccount()", async () => {
        tracker.on.select("users").response(undefined);

        const emptyArray = await userModel.findUserAccount("unknown");
        expect(emptyArray).toStrictEqual(undefined);
    });

    test("check user and password match with checkUserPassword()", async () => {
        tracker.on.select("users").response(dbUsers[0]);

        const goodpass = await userModel.checkUserPassword("admin", "pass");
        expect(goodpass).toStrictEqual(true);
        const badpass = await userModel.checkUserPassword("admin", "badpassword");
        expect(badpass).toStrictEqual(false);
    });

    test("check unknown user with checkUserPassword()", async () => {
        tracker.on.select("users").response(undefined);

        const nouser = await userModel.checkUserPassword("unknown", "pass");
        expect(nouser).toStrictEqual(false);
    });

    test("check user with empty password with checkUserPassword()", async () => {
        tracker.on.select("users").response(dbUsers[2]);

        let emptypassword = await userModel.checkUserPassword("skos_user", "pass");
        expect(emptypassword).toStrictEqual(false);
        emptypassword = await userModel.checkUserPassword("skos_user", "");
        expect(emptypassword).toStrictEqual(true);
    });

    test("add a new user with addUserAccount()", async () => {
        const addedUser = {
            id: "42",
            login: "login",
            password: "pass",
            groups: [],
            source: "",
            allowSourceCreation: false,
            maxNumberCreatedSource: 5,
        };

        tracker.on.select("users").response(undefined); // Unknown user
        tracker.on.insert("users").response([]);
        await userModel.addUserAccount(addedUser);

        const updatedUsers = Array.from(dbUsers);
        updatedUsers.push(userModel._convertToDatabase(addedUser));

        tracker.reset();
        tracker.on.select("public_users_list").response(updatedUsers);
        const users = await userModel.getUserAccounts();
        expect(users.login).toStrictEqual({
            "id": "undefined",  // This is managed by Postgres
            "login": "login",
            "password": "pass",
            "token": "",
            "groups": [],
            "source": "database",
            "allowSourceCreation": false,
            "maxNumberCreatedSource": 5,
        });
    });

    test("update an existing user with update()", async () => {
        const addedUser = {
            id: "42",
            login: "owl_user",
            password: "pass",
            groups: [],
            source: "",
            allowSourceCreation: false,
            maxNumberCreatedSource: 5,
        };

        tracker.on.select("users").response(dbUsers[1]); // Existing user
        expect(async () => {
            await userModel.addUserAccount(addedUser)
        }).rejects.toThrow();
    });
});
