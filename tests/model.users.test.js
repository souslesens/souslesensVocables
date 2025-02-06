const bcrypt = require("bcrypt");
const { createHash } = require("crypto");
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

        dbUsers = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "config", "users", "users.json")));
        dbPublicUsers = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "config", "users", "users.public.json")));
    });

    afterEach(() => {
        tracker.reset();
    });

    test("retrieve the list of all the account without private information", async () => {
        tracker.on.select("public_users_list").response(dbPublicUsers);

        const users = await userModel.getUserAccounts();
        expect(users).toStrictEqual({
            admin: {
                id: "1",
                login: "admin",
                password: "",
                token: "",
                groups: ["admin"],
                allowSourceCreation: false,
                maxNumberCreatedSource: 5,
                source: "database",
            },
            owl_user: {
                id: "2",
                login: "owl_user",
                password: "",
                token: "",
                groups: ["owl_only"],
                allowSourceCreation: false,
                maxNumberCreatedSource: 5,
                source: "database",
            },
            skos_user: {
                id: "3",
                login: "skos_user",
                password: "",
                token: "",
                groups: ["skos_only"],
                allowSourceCreation: false,
                maxNumberCreatedSource: 5,
                source: "database",
            },
            not_admin: {
                id: "4",
                login: "not_admin",
                password: "",
                token: "",
                groups: ["admin"],
                allowSourceCreation: true,
                maxNumberCreatedSource: 5,
                source: "database",
            },
        });
    });

    test("get an user account from the login", async () => {
        tracker.on.select("users").response(dbUsers[1]);

        const [login, user] = await userModel.getUserAccount("owl_user");
        expect(login).toStrictEqual("owl_user");
        expect(user.id).toStrictEqual("2");
        expect(user.login).toStrictEqual(login);
    });

    test("get an user account from an unknown login", async () => {
        tracker.on.select("users").response(undefined);

        const user = await userModel.getUserAccount("owl_user");
        expect(user).toBeUndefined();
    });

    test("find an user from an existing login", async () => {
        tracker.on.select("users").response(dbUsers[0]);

        const [login, user] = await userModel.findUserAccount("admin");
        expect(login).toStrictEqual("admin");
        expect(user.id).toStrictEqual("1");
        expect(user.login).toStrictEqual(login);
        expect(user.password).toStrictEqual("$2b$10$LhdaXF3tHrvA8b8fKMvNmeOSyogCBgN/L9XLN/vqjz6tgN5rSxMyy");
    });

    test("find an user from an unknown login", async () => {
        tracker.on.select("users").response(undefined);

        const emptyArray = await userModel.findUserAccount("unknown");
        expect(emptyArray).toStrictEqual(undefined);
    });

    test("find an user from an invalid login", async () => {
        const results = await userModel.findUserAccount(undefined);
        expect(results).toBeUndefined();
    });

    test("find an user from the corresponding token", async () => {
        tracker.on.select("users").response(dbUsers[2]);

        const [login, user] = await userModel.findUserAccountFromToken("skos-token");
        expect(login).toStrictEqual("skos_user");
        expect(user.id).toStrictEqual("3");
        expect(user.token).toStrictEqual("skos-token");
    });

    test("find an user from an unknown token", async () => {
        tracker.on.select("users").response(undefined);

        const user = await userModel.findUserAccountFromToken("unknown");
        expect(user).toBeUndefined();
    });

    test("find an user from an empty token", async () => {
        expect(async () => await userModel.findUserAccountFromToken("")).rejects.toThrow();

        expect(async () => await userModel.findUserAccountFromToken("  ")).rejects.toThrow();
    });

    test("check password match with external authenticator", async () => {
        tracker.on.select("users").response({ ...dbUsers[0], auth: "keycloak" });

        const badpass = await userModel.checkUserPassword("admin", "pass");
        expect(badpass).toBeFalsy();
    });

    test("check password match for an existing user", async () => {
        tracker.on.select("users").response(dbUsers[0]);

        const goodpass = await userModel.checkUserPassword("admin", "pass");
        expect(goodpass).toBeTruthy();
        const badpass = await userModel.checkUserPassword("admin", "badpassword");
        expect(badpass).toBeFalsy();
    });

    test("check password for an unknown user", async () => {
        tracker.on.select("users").response(undefined);

        const nouser = await userModel.checkUserPassword("unknown", "pass");
        expect(nouser).toBeFalsy();
    });

    test("check password for an user with an empty password", async () => {
        tracker.on.select("users").response(dbUsers[2]);

        let emptypassword = await userModel.checkUserPassword("skos_user", "pass");
        expect(emptypassword).toBeFalsy();
        emptypassword = await userModel.checkUserPassword("skos_user", "");
        expect(emptypassword).toBeTruthy();
    });

    test("add a new user", async () => {
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
            id: "undefined", // This is managed by Postgres
            login: "login",
            password: "pass",
            token: "",
            groups: [],
            source: "database",
            allowSourceCreation: false,
            maxNumberCreatedSource: 5,
        });
    });

    test("add a new user with an existing login", async () => {
        tracker.on.select("users").response(dbUsers[2]); // Existing user

        const user = {
            login: "skos_user",
            password: "",
            groups: [],
            source: "",
            allowSourceCreation: false,
            maxNumberCreatedSource: 5,
        };

        await expect(userModel.addUserAccount(user)).rejects.toThrow("The user already exists, try updating it");
    });

    test("add a new user with an invalid user", async () => {
        await expect(userModel.addUserAccount("skos_user")).rejects.toThrow("The user do not follow the standard");
    });

    test("generate a new token for existing user", async () => {
        tracker.on.select("users").response(dbUsers[3]);
        tracker.on.update("users").response([]);

        const token = await userModel.generateUserToken("not_admin");

        const suffix = createHash("sha256").update("not_admin").digest("hex");
        expect(token).toMatch(new RegExp(`^sls-.+${suffix.substring(0, 5)}$`));
    });

    test("generate a token with an unknown account", async () => {
        tracker.on.select("users").response(undefined);

        expect(async () => await userModel.generateUserToken("unknown")).rejects.toThrow();
    });

    test("update an existing user", async () => {
        tracker.on.select("users").response(dbUsers[1]);
        tracker.on.update("users").response([]);

        const user = {
            login: "owl_user",
            password: "pass",
            groups: [],
            source: "",
            allowSourceCreation: false,
            maxNumberCreatedSource: 5,
        };

        // FIXME: Why do we need to wrap this function?
        async () => await userModel.updateUserAccount(user);
    });

    test("update an unknown user", async () => {
        tracker.on.select("users").response(undefined);

        const user = {
            login: "unknown",
            password: "",
            groups: [],
            source: "",
            allowSourceCreation: false,
            maxNumberCreatedSource: 5,
        };

        await expect(userModel.updateUserAccount(user)).rejects.toThrow("UserAccount does not exist, try adding it.");
    });

    test("update an invalid user", async () => {
        await expect(userModel.updateUserAccount("unknown")).rejects.toThrow("The user do not follow the standard");
    });

    test("user with login admin is admin", async () => {
        tracker.on.select("public_users_list").response(dbUsers[0]);

        const result = await userModel.isAdmin("admin");
        expect(result).toBeTruthy();
    });

    test("user in group admin is admin", async () => {
        tracker.on.select("public_users_list").response(dbUsers[3]);

        const result = await userModel.isAdmin("not_admin");
        expect(result).toBeTruthy();
    });

    test("user not in group admin is not admin", async () => {
        tracker.on.select("public_users_list").response(dbUsers[2]);

        const result = await userModel.isAdmin("owl_user");
        expect(result).toBeFalsy();
    });

    /* FIXME: the mock cannot be done on the `conn("users")` part of the
     *        deleteUserAccount method. We needs to find a way to resolve
     *        this problem */
    test.skip("delete an existing user", async () => {
        tracker.on.select("users").response(dbUsers[2]);
        tracker.on.delete("users").response();

        const result = await userModel.deleteUserAccount("owl_user");
        expect(result).toBeTruthy();
    });

    test("delete an unknown user", async () => {
        tracker.on.select("users").response(undefined);

        const result = await userModel.deleteUserAccount("unknown");
        expect(result).toBeFalsy();
    });

    test("check isAdmin with an unknown account", async () => {
        tracker.on.select("public_users_list").response(undefined);

        await expect(userModel.isAdmin("unknown")).rejects.toThrow("UserAccount does not exist");
    });

    test("test _convertToDatabase with default values", async () => {
        expect(userModel._convertToDatabase({ login: "test" })).toStrictEqual({
            login: "test",
            password: "",
            token: "",
            profiles: [],
            create_source: false,
            maximum_source: 5,
            auth: "database",
        });
    });

    test("test _convertToLegacy with default values", async () => {
        expect(userModel._convertToLegacy({ id: 1, login: "test" })).toStrictEqual([
            "test",
            {
                id: "1",
                login: "test",
                password: "",
                token: "",
                groups: [],
                allowSourceCreation: false,
                maxNumberCreatedSource: 5,
                source: "database",
            },
        ]);
    });
});
