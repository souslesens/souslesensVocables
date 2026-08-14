import fs from "fs";
import path from "path";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

/*
 * Historically sources were created with one of the boilerplate `topClassFilter` values below,
 * either "?topConcept rdf:type owl:Class ." (which selects every class of the ontology instead of
 * its roots, so the Lineage tree opens on a flat list) or an early root filter that keeps the
 * owl:Restriction parents Virtuoso exposes as `nodeID://` IRIs.
 *
 * An empty `topClassFilter` makes Sparql_OWL.getTopConcepts fall back to Sparql_OWL.defaultTopClassFilter,
 * the maintained root query. See public/vocables/modules/sparqlProxies/sparql_OWL.js.
 *
 * Only the generic variants listed below are reset. Any hand-written filter (BFO, lis14, DUL, ...)
 * is preserved untouched.
 */

const RESET_TOP_CLASS_FILTER_VALUE = "";

const owlClassIriRegex = /<http:\/\/www\.w3\.org\/2002\/07\/owl#class>/g;
const whitespaceRegex = /\s+/g;
const trailingDotRegex = /\.$/;

/**
 * Reduces a topClassFilter to a comparable signature: case, whitespace and trailing dot removed,
 * full owl:Class IRI collapsed to its prefixed form, so that formatting variants of the same
 * boilerplate filter share one signature.
 */
const normalizeTopClassFilter = (topClassFilter) => {
    const lowerCased = topClassFilter.toLowerCase();
    const withPrefixedOwlClass = lowerCased.replace(owlClassIriRegex, "owl:class");
    const withoutWhitespace = withPrefixedOwlClass.replace(whitespaceRegex, "");
    return withoutWhitespace.replace(trailingDotRegex, "");
};

/*
 * Filters that carry no information specific to an ontology, only the ones whose reset cannot make
 * a concept disappear from the tree on an instance we cannot inspect:
 *  - "every owl:Class", which flattens the tree and matches the default on hierarchy-less ontologies
 *  - the two hand-written `FILTER NOT EXISTS` variants, whose exclusion set contains the default's,
 *    so resetting them can only reveal more roots
 *  - the rdfs:type typo variants, which filter nothing at all and list the classes that do have a
 *    parent, that is the exact opposite of a root
 *
 * The `isUri` filter of the bin source creators and the hand-pasted MINUS query are deliberately
 * left alone: they are the only ones whose reset also removes entries (classes holding both a
 * parent class and an untyped parent), so they stay a deliberate choice to revisit source by source.
 */
const genericTopClassFilters = [
    "?topConcept rdf:type owl:Class .",
    "?topConcept rdf:type owl:Class . FILTER NOT EXISTS { ?topConcept rdfs:subClassOf ?superClass.?superClass rdf:type owl:Class. }",
    "FILTER NOT EXISTS { ?topConcept rdfs:subClassOf ?superClass.?superClass rdf:type owl:Class. }",
    "?topConcept rdfs:subClassOf ?superClass filter( not exists {?superClass  rdfs:type <http://www.w3.org/2002/07/owl#Class>})",
    "?topConcept rdfs:subClassOf ?superClass. filter( not exists {?superClass  rdfs:type <http://www.w3.org/2002/07/owl#Class>})",
];

const genericTopClassFilterSignatures = new Set();
for (const genericTopClassFilter of genericTopClassFilters) {
    genericTopClassFilterSignatures.add(normalizeTopClassFilter(genericTopClassFilter));
}

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
