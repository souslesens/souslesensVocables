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
        });
    });
});
