const fs = require("fs");
const os = require("os");
const yargs = require("yargs");
const path = require("path");

const argv = yargs.alias("c", "config").describe("c", "Path to config directory").demandOption(["c"]).alias("w", "write").describe("w", "Write to the file").boolean("w").help().argv;

const mainconfigFilePath = path.resolve(argv.config, "mainConfig.json");
const mainconfig = JSON.parse(fs.readFileSync(mainconfigFilePath, { encoding: "utf-8" }));

const today = new Date();
const todayKey = today.toISOString().slice(0, 7);

// Only keep one year of log
const lastValidDate = new Date(today.getFullYear() - 1, today.getMonth());

["vocables.log", "error.log"].forEach((logfile) => {
    const vocablesLogPath = path.resolve(mainconfig.logDir || "log/souslesens", logfile);

    // return if no log file
    if (!fs.existsSync(vocablesLogPath)) {
        return 0;
    }
    // return if file is already migrated
    if (fs.lstatSync(vocablesLogPath).isSymbolicLink()) {
        return 0;
    }

    const logsPeriods = new Map();
    fs.readFileSync(vocablesLogPath, "utf-8")
        .split(/\r?\n/)
        .forEach((line) => {
            if (line) {
                const json_line = JSON.parse(line);
                if (logfile == "vocables.log") {
                    const message_json = json_line.message.split(",");
                    message_json.splice(3, 0, "");
                    json_line.message = message_json.join(",");
                }
                const date = json_line.timestamp.split(" ")[0].slice(0, 7);
                if (!logsPeriods.has(date)) {
                    logsPeriods.set(date, []);
                }
                logsPeriods.get(date).push(JSON.stringify(json_line));
            }
        });

    logsPeriods.forEach((value, key) => {
        const monthlyLogPath = path.resolve(mainconfig.logDir || path.join("log", "souslesens"), `${logfile}.${key}`);
        const monthlyLogDate = new Date(key);

        if (monthlyLogDate > lastValidDate) {
            if (argv.w) {
                fs.writeFileSync(monthlyLogPath, value.join(os.EOL) + os.EOL);
            } else {
                console.log(`write ${monthlyLogPath}`);
            }
        } else {
            console.warn(`ignore ${monthlyLogPath}`);
        }
    });

    const newVocablesLogPath = path.resolve(mainconfig.logDir || path.join("log", "souslesens"), `${logfile}.${todayKey}`);
    if (argv.w) {
        if (!fs.existsSync(newVocablesLogPath)) {
            fs.renameSync(vocablesLogPath, newVocablesLogPath);
        } else {
            fs.rmSync(vocablesLogPath);
        }
    } else {
        console.log(`${newVocablesLogPath} -> ${vocablesLogPath}`);
    }
});
