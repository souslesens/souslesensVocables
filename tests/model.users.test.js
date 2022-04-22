const path = require("path");
const { UserModel } = require(path.resolve("model/users"));

const userModel = new UserModel(path.resolve("tests/data/config"));

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
