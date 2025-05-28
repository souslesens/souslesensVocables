const bcrypt = require("bcrypt");
const { createHash } = require("crypto");
const fs = require("fs");
const path = require("path");
const tmp = require("tmp");

const { cleanupConnection, getKnexConnection } = require("../model/utils");
const { userModel } = require("../model/users");
const { userDataModel } = require("../model/userData");

jest.mock("../model/utils");

describe("UserModelJson", () => {
    let dbUsers;

    beforeAll(() => {
        dbUsers = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "config", "users", "users.json")));
        dbPublicUsers = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "config", "users", "users.public.json")));
        dbUserData = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "config", "users", "userData.json")));
        dbUserDataList = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "config", "users", "userData.list.json")));
    });

    test("retrieve the list of all the account without private information", async () => {
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
                source: "keycloak",
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
        const [login, user] = await userModel.getUserAccount("owl_user");
        expect(login).toStrictEqual("owl_user");
        expect(user.id).toStrictEqual("2");
        expect(user.login).toStrictEqual(login);
    });

    test("get an user account from an unknown login", async () => {
        const user = await userModel.getUserAccount("owl_user2");
        expect(user).toBeUndefined();
    });

    test("find an user from an existing login", async () => {
        const [login, user] = await userModel.findUserAccount("admin");
        expect(login).toStrictEqual("admin");
        expect(user.id).toStrictEqual("1");
        expect(user.login).toStrictEqual(login);
        expect(user.password).toStrictEqual("$2b$10$LhdaXF3tHrvA8b8fKMvNmeOSyogCBgN/L9XLN/vqjz6tgN5rSxMyy");
    });

    test("find an user from an unknown login", async () => {
        const emptyArray = await userModel.findUserAccount("unknown");
        expect(emptyArray).toStrictEqual(undefined);
    });

    test("find an user from an invalid login", async () => {
        const results = await userModel.findUserAccount(undefined);
        expect(results).toBeUndefined();
    });

    test("find an user from the corresponding token", async () => {
        const [login, user] = await userModel.findUserAccountFromToken("skos-token");
        expect(login).toStrictEqual("skos_user");
        expect(user.id).toStrictEqual("3");
        expect(user.token).toStrictEqual("skos-token");
    });

    test("find an user from an unknown token", async () => {
        const user = await userModel.findUserAccountFromToken("unknown");
        expect(user).toBeUndefined();
    });

    test("find an user from an empty token", async () => {
        expect(async () => await userModel.findUserAccountFromToken("")).rejects.toThrow();

        expect(async () => await userModel.findUserAccountFromToken("  ")).rejects.toThrow();
    });

    test("check password match with external authenticator", async () => {
        const badpass = await userModel.checkUserPassword("skos_user", "pass");
        expect(badpass).toBeFalsy();
    });

    test("check password match for an existing user", async () => {
        const goodpass = await userModel.checkUserPassword("admin", "pass");
        expect(goodpass).toBeTruthy();
        const badpass = await userModel.checkUserPassword("admin", "badpassword");
        expect(badpass).toBeFalsy();
    });

    test("check password for an unknown user", async () => {
        const nouser = await userModel.checkUserPassword("unknown", "pass");
        expect(nouser).toBeFalsy();
    });

    test("check password for an user with an empty password", async () => {
        let emptypassword = await userModel.checkUserPassword("not_admin", "pass");
        expect(emptypassword).toBeFalsy();
        emptypassword = await userModel.checkUserPassword("not_admin", "");
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
        const results = await userModel.addUserAccount(addedUser);
        expect(results).toStrictEqual(5);
    });

    test("add a new user with an existing login", async () => {
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
        const token = await userModel.generateUserToken("not_admin");

        const suffix = createHash("sha256").update("not_admin").digest("hex");
        expect(token).toMatch(new RegExp(`^sls-.+${suffix.substring(0, 5)}$`));
    });

    test("generate a token with an unknown account", async () => {
        expect(async () => await userModel.generateUserToken("unknown")).rejects.toThrow();
    });

    test("update an existing user", async () => {
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
        const result = await userModel.isAdmin("admin");
        expect(result).toBeTruthy();
    });

    test("user in group admin is admin", async () => {
        const result = await userModel.isAdmin("not_admin");
        expect(result).toBeTruthy();
    });

    test("user not in group admin is not admin", async () => {
        const result = await userModel.isAdmin("owl_user");
        expect(result).toBeFalsy();
    });

    test("delete an existing user", async () => {
        const result = await userModel.deleteUserAccount("admin");
        expect(result).toBeTruthy();
    });

    test("delete an unknown user", async () => {
        const result = await userModel.deleteUserAccount("unknown");
        expect(result).toBeFalsy();
    });

    test("check isAdmin with an unknown account", async () => {
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
