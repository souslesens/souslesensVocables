const path = require("path");
const { UserModel } = require("../model/users");

const userModel = new UserModel(path.join(__dirname, "data/config"));

test("The list of users is returned", async () => {
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
