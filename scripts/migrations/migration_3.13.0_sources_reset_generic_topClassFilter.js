import fs from "fs";
import path from "path";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

/*
 * Historically most sources were created with `topClassFilter: "?topConcept rdf:type owl:Class ."`.
 * That filter selects every class of the ontology instead of its roots, so the Lineage tree opens
 * on a flat list of all classes.
 *
 * An empty `topClassFilter` makes Sparql_OWL.getTopConcepts fall back to the computed default
 * (`?topConcept rdf:type owl:Class. filter(NOT EXISTS {?topConcept <taxonomyPredicates> ?z})`),
 * which honours the taxonomy predicates declared on each source. See
 * public/vocables/modules/sparqlProxies/sparql_OWL.js getTopConcepts.
 *
 * Only the generic variants above are reset. Any hand-written filter (BFO, lis14, DUL, ...) is
 * preserved untouched.
 */

const RESET_TOP_CLASS_FILTER_VALUE = "";

const owlClassIriRegex = /<http:\/\/www\.w3\.org\/2002\/07\/owl#Class>/g;
const whitespaceRunRegex = /\s+/g;
const trailingDotRegex = /\s*\.\s*$/;

/* Normalized forms considered equivalent to "give me every owl:Class", i.e. no real root filtering. */
const genericTopClassFilterSignatures = new Set(["?topconcept rdf:type owl:class"]);

/**
 * Reduces a topClassFilter to a comparable signature: full owl:Class IRI collapsed to its prefixed
 * form, whitespace runs collapsed, trailing dot and case differences removed.
 */
const normalizeTopClassFilter = (topClassFilter) => {
    const withPrefixedOwlClass = topClassFilter.replace(owlClassIriRegex, "owl:Class");
    const withSingleSpaces = withPrefixedOwlClass.replace(whitespaceRunRegex, " ");
    const withoutTrailingDot = withSingleSpaces.trim().replace(trailingDotRegex, "");
    return withoutTrailingDot.toLowerCase();
};

const isGenericTopClassFilter = (topClassFilter) => {
    if (typeof topClassFilter !== "string" || topClassFilter.trim() === "") {
        return false;
    }
    return genericTopClassFilterSignatures.has(normalizeTopClassFilter(topClassFilter));
};

const migrateSources = (configDirectory, writeMode) => {
    const sourcesFilePath = path.resolve(configDirectory, "sources.json");
    const sources = JSON.parse(fs.readFileSync(sourcesFilePath, { encoding: "utf-8" }));

    const resetSourceNames = [];
    const preservedSourceNames = [];
    const alreadyEmptySourceNames = [];

    for (const [sourceName, source] of Object.entries(sources)) {
        const currentTopClassFilter = source.topClassFilter;

        if (currentTopClassFilter === undefined || currentTopClassFilter === null || currentTopClassFilter.trim() === "") {
            alreadyEmptySourceNames.push(sourceName);
            source.topClassFilter = RESET_TOP_CLASS_FILTER_VALUE;
            continue;
        }

        if (!isGenericTopClassFilter(currentTopClassFilter)) {
            preservedSourceNames.push(sourceName);
            continue;
        }

        resetSourceNames.push(sourceName);
        source.topClassFilter = RESET_TOP_CLASS_FILTER_VALUE;
    }

    console.info(`Sources read from ${sourcesFilePath}: ${Object.keys(sources).length}`);
    console.info(`  generic topClassFilter to reset : ${resetSourceNames.length}`);
    console.info(`  custom topClassFilter preserved : ${preservedSourceNames.length}`);
    console.info(`  already empty or missing        : ${alreadyEmptySourceNames.length}`);

    if (resetSourceNames.length > 0) {
        console.info("Sources whose topClassFilter is reset to the default query:");
        for (const sourceName of resetSourceNames) {
            console.info(`  - ${sourceName}`);
        }
    }

    if (preservedSourceNames.length > 0) {
        console.info("Sources keeping their custom topClassFilter:");
        for (const sourceName of preservedSourceNames) {
            console.info(`  - ${sourceName}: ${JSON.stringify(sources[sourceName].topClassFilter)}`);
        }
    }

    if (resetSourceNames.length === 0 && alreadyEmptySourceNames.length === 0) {
        console.info("Nothing to migrate, the file is already up to date");
        return;
    }

    if (!writeMode) {
        console.info("Dry run, no file written. Re-run with -w to apply.");
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
    .describe("w", "Write the migration in the file")
    .boolean("w")
    .demandOption(["config"])
    .help().argv;

console.info(argv.write ? "🚧 Reset the generic topClassFilter on sources…" : "🔧 Dry run mode…");
migrateSources(argv.config, argv.write);
