import fs from "fs";
import path from "path";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

const migrateMainConfig = async (configDirectory, writeMode) => {
    const configPath = path.resolve(configDirectory, "mainConfig.json");
    const configJSON = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }));

    const toolsAvailable = configJSON.tools_available;
    if (toolsAvailable.includes("UserManagement")) {
        const updatedToolsAvailable = toolsAvailable.map((tool) => {
            if (tool === "UserManagement") {
                return "UserSettings";
            }
            return tool;
        });
        configJSON.tools_available = updatedToolsAvailable;
        if (writeMode) {
            console.info(" ✅ The mainConfig.json was updated");
            fs.writeFileSync(configPath, JSON.stringify(configJSON, null, 2));
        } else {
            console.debug(" ! The mainConfig.json will be updated");
        }
    } else {
        console.info(" 👍 Nothing to do");
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
    await migrateMainConfig(argv.config, argv.write);
};

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
