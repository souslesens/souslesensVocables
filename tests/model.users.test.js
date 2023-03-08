const fs = require("fs");
const bcrypt = require("bcrypt");
const path = require("path");
const { UserModelJson } = require("../model/users");
const tmp = require("tmp");

describe("UserModelJson", () => {
    /**
     * @type {UserModelJson}
     */
    let userModelJson;
    beforeAll(() => {
        userModelJson = new UserModelJson(path.join(__dirname, "data/config"));
    });

    test("read the list of users with get()", async () => {
        const users = await userModelJson.getUserAccounts();
        expect(users).toStrictEqual({
            admin: {
                id: "admin",
                login: "admin",
                groups: ["admin"],
                source: "json",
                _type: "user",
            },
            owl_user: {
                id: "owl_user",
                login: "owl_user",
                groups: ["owl_only"],
                source: "json",
                _type: "user",
            },
            skos_user: {
                id: "skos_user",
                login: "skos_user",
                groups: ["skos_only"],
                source: "json",
                _type: "user",
            },
        });
    });
    test("find a user with findUserAccount()", async () => {
        const users = await userModelJson.findUserAccount("admin");
        expect(users).toStrictEqual({
            id: "admin",
            login: "admin",
            groups: ["admin"],
            source: "json",
            _type: "user",
        });
    });
    test("fail to find a user with findUserAccount()", async () => {
        const emptyArray = await userModelJson.findUserAccount("unknown");
        expect(emptyArray).toStrictEqual(undefined);
    });
    test("check user and password match with checkUserPassword()", async () => {
        let goodpass = await userModelJson.checkUserPassword("admin", "pass");
        expect(goodpass).toStrictEqual(true);
        let badpass = await userModelJson.checkUserPassword("admin", "badpassword");
        expect(badpass).toStrictEqual(false);
        let nouser = await userModelJson.checkUserPassword("unknown", "pass");
        expect(nouser).toStrictEqual(false);
        let emptypassword = await userModelJson.checkUserPassword("skos_user", "pass");
        expect(emptypassword).toStrictEqual(false);
        emptypassword = await userModelJson.checkUserPassword("skos_user", "");
        expect(emptypassword).toStrictEqual(false);
    });
    test("append a new user with add()", async () => {
        tmpDir = tmp.dirSync({ unsafeCleanup: true });
        fs.mkdirSync(path.join(tmpDir.name, "users"));
        fs.writeFileSync(path.join(tmpDir.name, "users", "users.json"), "{}");
        const tmpUserModelJson = new UserModelJson(tmpDir.name);
        const newUser = {
            id: "ID",
            login: "LOGIN",
            password: "pass",
            groups: [],
            source: "",
            _type: "user",
        };
        const expected = {
            id: "ID",
            login: "LOGIN",
            groups: [],
            source: "",
            _type: "user",
        };
        await tmpUserModelJson.addUserAccount(newUser);
        const users = await tmpUserModelJson.getUserAccounts();
        expect(users).toStrictEqual({ LOGIN: expected });
        tmpDir.removeCallback();
    });
    test("update an existing user with update()", async () => {
        const USERS = {
            LOGIN1: {
                id: "ID1",
                login: "LOGIN1",
                password: "pass",
                groups: [],
                source: "",
                _type: "user",
            },
            LOGIN2: { id: "ID2", login: "LOGIN2", password: "pass", groups: [], source: "", _type: "user" },
        };
        tmpDir = tmp.dirSync({ unsafeCleanup: true });
        fs.mkdirSync(path.join(tmpDir.name, "users"));
        fs.writeFileSync(path.join(tmpDir.name, "users", "users.json"), JSON.stringify(USERS));
        const tmpUserModelJson = new UserModelJson(tmpDir.name);
        const modifiedUser = {
            id: "ID1",
            login: "LOGIN1",
            groups: ["test"],
            source: "",
            _type: "user",
        };
        const user2WithoutPass = {
            id: "ID2",
            login: "LOGIN2",
            groups: [],
            source: "",
            _type: "user",
        };
        await tmpUserModelJson.updateUserAccount(modifiedUser);
        const users = await tmpUserModelJson.getUserAccounts();
        expect(users).toStrictEqual({ LOGIN1: modifiedUser, LOGIN2: user2WithoutPass });
        tmpDir.removeCallback();
    });
});
