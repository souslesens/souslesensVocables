import fs from "fs";
import knex from "knex";
import path from "path";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

/*
 * The source selector tree gives a group, a subgroup and a source the same id, their name: a subgroup
 * named like a source drops that source from the selector or hangs sources under another source.
 *
 * The profiles grant rights on "schemaType/group/source" keys (treeStr in SourceModel._getAllowedSources),
 * so their keys follow the renamed subgroups.
 */
const groupSuffix = "-Group";

/**
 * @returns {{newGroupBySourceName: Record<string, string>, newTreeStrsByOldTreeStr: Record<string, string[]>}}
 * one key may name a source and the subgroup of another source, hence several new keys
 */
const computeNewGroupsAndTreeStrs = (sources) => {
    const sourceNames = Object.keys(sources);
    const sourcesList = Object.values(sources);
    const groupsOfSources = sourcesList.map((source) => source.group || "");
    const subGroupsOfSources = groupsOfSources.flatMap((group) => group.split("/"));
    const newGroupBySourceName = {};
    const newTreeStrsByOldTreeStr = {};
    const folderMergeLines = new Set();

    for (const [sourceName, source] of Object.entries(sources)) {
        const group = source.group || "";
        const subGroups = group.split("/");
        const newSubGroups = [];
        for (const subGroup of subGroups) {
            let newSubGroup = subGroup;
            // a source may already be named "<subgroup>-Group"
            while (sourceNames.includes(newSubGroup)) {
                newSubGroup += groupSuffix;
            }
            if (newSubGroup !== subGroup && subGroupsOfSources.includes(newSubGroup)) {
                folderMergeLines.add(`${subGroup} becomes ${newSubGroup}, a group that already exists: both folders merge`);
            }
            newSubGroups.push(newSubGroup);
        }
        const newGroup = newSubGroups.join("/");
        if (newGroup !== group) {
            newGroupBySourceName[sourceName] = newGroup;
        }

        const oldTree = [source.schemaType, ...subGroups, sourceName];
        const newTree = [source.schemaType, ...newSubGroups, sourceName];
        // a profile may grant a right on any level of the tree
        for (let prefixLength = 1; prefixLength <= oldTree.length; prefixLength++) {
            const oldTreePrefix = oldTree.slice(0, prefixLength);
            const newTreePrefix = newTree.slice(0, prefixLength);
            const oldTreeStr = oldTreePrefix.join("/");
            const newTreeStr = newTreePrefix.join("/");
            const newTreeStrs = newTreeStrsByOldTreeStr[oldTreeStr] || [];
            if (!newTreeStrs.includes(newTreeStr)) {
                newTreeStrsByOldTreeStr[oldTreeStr] = [...newTreeStrs, newTreeStr];
            }
        }
    }
    for (const folderMergeLine of folderMergeLines) {
        console.warn(folderMergeLine);
    }
    return { newGroupBySourceName, newTreeStrsByOldTreeStr };
};

const renameProfilesAccessControl = async (configDirectory, newTreeStrsByOldTreeStr, writeMode) => {
    const mainConfigPath = path.resolve(configDirectory, "mainConfig.json");
    const mainConfig = JSON.parse(fs.readFileSync(mainConfigPath, { encoding: "utf-8" }));
    const connection = await knex({ client: "pg", connection: mainConfig.database });
    try {
        await connection.transaction(async (transaction) => {
            const profiles = await transaction.select("label", "access_control").from("profiles");
            const conflictLines = [];
            for (const profile of profiles) {
                // a json column, pg parses it
                const sourcesAccessControl = profile.access_control || {};
                const accessControlsByNewTreeStr = {};
                const renamedKeyLines = [];
                for (const [treeStr, accessControl] of Object.entries(sourcesAccessControl)) {
                    const newTreeStrs = newTreeStrsByOldTreeStr[treeStr] || [treeStr];
                    for (const newTreeStr of newTreeStrs) {
                        const accessControls = accessControlsByNewTreeStr[newTreeStr] || [];
                        accessControlsByNewTreeStr[newTreeStr] = [...accessControls, accessControl];
                    }
                    const isKeptAsIs = newTreeStrs.length === 1 && newTreeStrs[0] === treeStr;
                    if (!isKeptAsIs) {
                        renamedKeyLines.push(`  - ${treeStr} -> ${newTreeStrs.join(", ")}`);
                    }
                }
                if (renamedKeyLines.length === 0) {
                    continue;
                }
                console.info(`Profile ${profile.label}:`);
                for (const renamedKeyLine of renamedKeyLines) {
                    console.info(renamedKeyLine);
                }
                const newSourcesAccessControl = {};
                for (const [newTreeStr, accessControls] of Object.entries(accessControlsByNewTreeStr)) {
                    const distinctAccessControls = [...new Set(accessControls)];
                    if (distinctAccessControls.length > 1) {
                        conflictLines.push(`Profile ${profile.label}: ${newTreeStr} would be both ${distinctAccessControls.join(" and ")}`);
                    }
                    newSourcesAccessControl[newTreeStr] = distinctAccessControls[0];
                }
                if (writeMode) {
                    await transaction("profiles")
                        .where("label", profile.label)
                        .update({ access_control: JSON.stringify(newSourcesAccessControl) });
                }
            }
            // the transaction rolls back, nothing is written
            if (conflictLines.length > 0) {
                throw new Error(`Two rights land on one key, set them by hand first:\n${conflictLines.join("\n")}`);
            }
        });
    } finally {
        await connection.destroy();
    }
};

const migrateSources = async (configDirectory, writeMode) => {
    const sourcesFilePath = path.resolve(configDirectory, "sources.json");
    const sources = JSON.parse(fs.readFileSync(sourcesFilePath, { encoding: "utf-8" }));
    const { newGroupBySourceName, newTreeStrsByOldTreeStr } = computeNewGroupsAndTreeStrs(sources);
    const newGroupEntries = Object.entries(newGroupBySourceName);

    if (newGroupEntries.length === 0) {
        console.info("No subgroup named like a source, the file is already up to date");
        return;
    }
    console.info("Sources whose group is renamed:");
    for (const [sourceName, newGroup] of newGroupEntries) {
        console.info(`  - ${sourceName}: ${newGroup}`);
        sources[sourceName].group = newGroup;
    }

    // profiles first: rerun after a failed sources.json write finds the same renames, while the reverse would orphan the keys
    await renameProfilesAccessControl(configDirectory, newTreeStrsByOldTreeStr, writeMode);

    if (!writeMode) {
        console.info("Dry run, nothing written. Re-run with -w to apply.");
        return;
    }
    const backupFilePath = path.resolve(configDirectory, `sources_${Date.now()}_backup.json`);
    fs.cpSync(sourcesFilePath, backupFilePath);
    fs.writeFileSync(sourcesFilePath, JSON.stringify(sources, null, 2));
    console.info(`Backup written to ${backupFilePath}`);
    console.info(`${sourcesFilePath} updated`);
};

const argv = yargs(hideBin(process.argv))
    .alias("c", "config")
    .describe("c", "Path to the config directory")
    .alias("w", "write")
    .describe("w", "Write the migration in the file and the database")
    .boolean("w")
    .demandOption(["config"])
    .help().argv;

console.info(argv.write ? "🚧 Rename the subgroups named like a source…" : "🔧 Dry run mode…");
migrateSources(argv.config, argv.write)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
