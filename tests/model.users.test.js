const fs = require("fs");
const path = require("path");
const { UserModel } = require("../model/users");
const tmp = require("tmp");

describe("UserModel", () => {
    /**
     * @type {UserModel}
     */
    let userModel;
    beforeAll(() => {
        userModel = new UserModel(path.join(__dirname, "data/config"));
    });

    test("read the list of users with get()", async () => {
        const users = await userModel.getUserAccounts();
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
        const users = await userModel.findUserAccount("admin");
        expect(users).toStrictEqual(
            {
                id: "admin",
                login: "admin",
                groups: ["admin"],
                source: "json",
                _type: "user",
            });
    });
    test("fail to find a user with findUserAccount()", async () => {
        const emptyArray = await userModel.findUserAccount("unknown");
        expect(emptyArray).toStrictEqual(undefined);
    });
    test("append a new user with add()", async () => {
        tmpDir = tmp.dirSync({ unsafeCleanup: true });
        fs.mkdirSync(path.join(tmpDir.name, "users"));
        fs.writeFileSync(path.join(tmpDir.name, "users", "users.json"), "{}");
        const tmpUserModel = new UserModel(tmpDir.name);
        const newUser = {
            id: "ID",
            login: "LOGIN",
            groups: [],
            source: "",
            _type: "user",
        };
        await tmpUserModel.addUserAccount(newUser);
        const users = await tmpUserModel.getUserAccounts();
        expect(users).toStrictEqual({ ID: newUser });
        tmpDir.removeCallback();
    });
    test("update an existing user with update()", async () => {
        const USERS = {
            ID1: {
                id: "ID1",
                login: "LOGIN1",
                groups: [],
                source: "",
                _type: "user",
            },
            ID2: { id: "ID2", login: "LOGIN2", groups: [], source: "", _type: "user" },
        };
        tmpDir = tmp.dirSync({ unsafeCleanup: true });
        fs.mkdirSync(path.join(tmpDir.name, "users"));
        fs.writeFileSync(path.join(tmpDir.name, "users", "users.json"), JSON.stringify(USERS));
        const tmpUserModel = new UserModel(tmpDir.name);
        const modifiedUser = {
            id: "ID1",
            login: "login",
            groups: [],
            source: "",
            _type: "user",
        };
        await tmpUserModel.updateUserAccount(modifiedUser);
        const users = await tmpUserModel.getUserAccounts();
        expect(users).toStrictEqual({ ID1: modifiedUser, ID2: USERS["ID2"] });
        tmpDir.removeCallback();
    });
});
