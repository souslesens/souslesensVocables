import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { UserModel } from "../../model/users.js";

const addMissingTokenToUsers = async (_configDirectory, writeMode) => {
    const userModel = new UserModel();
    const users = await userModel.getUserAccounts(false);
    const toUpdate = Object.entries(users)
        .filter(([_id, user]) => !user.token)
        .map(([_id, user]) => user.login);
    if (writeMode) {
        for (const user of toUpdate) {
            await userModel.generateUserToken(user);
        }
        if (toUpdate.length > 0) {
            console.log("✅ Done");
        } else {
            console.log("Nothing to do");
        }
    }
};

const main = async () => {
    const argv = yargs(hideBin(process.argv))
        .alias("c", "config")
        .describe("c", "Path to the config directory")
        .alias("w", "write")
        .describe("w", "Write the migration in the file")
        .boolean("w")
        .demandOption(["config"])
        .help().argv;

    console.info(argv.write ? "🚧 Prepare the migration…" : "🔧 Dry run mode…");
    await addMissingTokenToUsers(argv.config, argv.write);
};

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
