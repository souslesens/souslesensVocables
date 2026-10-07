import fs from "fs";
import knex from "knex";
import path from "path";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { getSourceGroupSegments } from "../../model/sourceGroups.js";

/*
 * The source selector tree gives a group segment and a source the same jstree id, their bare name.
 * A group segment named like any source makes the tree loop forever or re-parent sources, so every
 * such segment gets a suffix, in every group holding it. SourceModel now refuses the collision.
 *
 * The profiles grant rights on "schemaType/group/source" paths (model/sources.js _getAllowedSources),
 * so their access control keys follow the renamed groups.
 */
const groupSuffix = "-Group";

const readJsonFile = (filePath) => JSON.parse(fs.readFileSync(filePath, { encoding: "utf-8" }));

/**
 * Renames in place the group segments named like a source.
 * @returns {{renamedSourceNames: string[], renamedTreePaths: Record<string, string>}}
 * renamedTreePaths maps every old access control path of a renamed source to its new path
 */
const renameGroupSegmentsNamedLikeSources = (sources) => {
    const sourceNames = Object.keys(sources);
    const renamedSourceNames = [];
    const renamedTreePaths = {};

    for (const [sourceName, source] of Object.entries(sources)) {
        const groupSegments = getSourceGroupSegments(source.group);
        const isGroupNamedLikeSource = groupSegments.some((segment) => sourceNames.includes(segment));
        if (!isGroupNamedLikeSource) {
            continue;
        }
        const renamedSegments = groupSegments.map((segment) => {
            let renamedSegment = segment;
            // a source may already be named "<segment>-Group"
            while (sourceNames.includes(renamedSegment)) {
                renamedSegment += groupSuffix;
            }
            return renamedSegment;
        });

        const oldTreePath = [source.schemaType, ...groupSegments, sourceName];
        const newTreePath = [source.schemaType, ...renamedSegments, sourceName];
        // a profile may grant a right on any level of the tree, the schemaType alone never moves
        for (let pathLength = 2; pathLength <= oldTreePath.length; pathLength++) {
            renamedTreePaths[oldTreePath.slice(0, pathLength).join("/")] = newTreePath.slice(0, pathLength).join("/");
        }
        source.group = renamedSegments.join("/");
        renamedSourceNames.push(sourceName);
    }
    return { renamedSourceNames, renamedTreePaths };
};

const renameProfilesAccessControl = async (configDirectory, renamedTreePaths, writeMode) => {
    const mainConfig = readJsonFile(path.resolve(configDirectory, "mainConfig.json"));
    const connection = await knex({ client: "pg", connection: mainConfig.database });
    try {
        await connection.transaction(async (transaction) => {
            const profiles = await transaction.select("label", "access_control").from("profiles");
            for (const profile of profiles) {
                const accessControl = typeof profile.access_control === "string" ? JSON.parse(profile.access_control) : profile.access_control || {};
                const treePaths = Object.keys(accessControl);
                const renamedProfileTreePaths = treePaths.filter((treePath) => treePath in renamedTreePaths);
                if (renamedProfileTreePaths.length === 0) {
                    continue;
                }
                const renamedAccessControl = {};
                for (const [treePath, accessRight] of Object.entries(accessControl)) {
                    renamedAccessControl[renamedTreePaths[treePath] || treePath] = accessRight;
                }
                console.info(`Profile ${profile.label}:`);
                for (const treePath of renamedProfileTreePaths) {
                    console.info(`  - ${treePath} -> ${renamedTreePaths[treePath]}`);
                }
                if (writeMode) {
                    await transaction("profiles")
                        .where("label", profile.label)
                        .update({ access_control: JSON.stringify(renamedAccessControl) });
                }
            }
        });
    } finally {
        await connection.destroy();
    }
};

const migrateSources = async (configDirectory, writeMode) => {
    const sourcesFilePath = path.resolve(configDirectory, "sources.json");
    const sources = readJsonFile(sourcesFilePath);
    const { renamedSourceNames, renamedTreePaths } = renameGroupSegmentsNamedLikeSources(sources);

    if (renamedSourceNames.length === 0) {
        console.info("No group named like a source, the file is already up to date");
        return;
    }
    console.info("Sources whose group is renamed:");
    for (const sourceName of renamedSourceNames) {
        console.info(`  - ${sourceName}: ${sources[sourceName].group}`);
    }

    // profiles first: rerun after a failed sources.json write finds the same renames, while the reverse would orphan the keys
    await renameProfilesAccessControl(configDirectory, renamedTreePaths, writeMode);

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

console.info(argv.write ? "🚧 Rename the groups named like a source…" : "🔧 Dry run mode…");
migrateSources(argv.config, argv.write)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
