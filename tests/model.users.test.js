const path = require("path");
const { UserModel } = require("../model/users");

describe("UserModel", () => {
    /**
     * @type {UserModel}
     */
    let userModel;
    beforeAll(() => {
        userModel = new UserModel(path.join(__dirname, "data/config"));
    });

    test("getUserAccounts returns the list of users", async () => {
        const users = await userModel.getUserAccounts();
        expect(users).toStrictEqual({
            admin: {
                id: "admin",
                login: "admin",
                groups: ["admin"],
                source: "json",
                _type: "user",
            },
            regular1: {
                id: "regular1",
                login: "regular1",
                groups: ["regular1"],
                source: "json",
                _type: "user",
            },
            regular2: {
                id: "regular2",
                login: "regular2",
                groups: ["regular2"],
                source: "json",
                _type: "user",
            },
        });
    });
});
