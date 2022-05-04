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
});
