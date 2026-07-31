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
 * Filters written by the app itself rather than for a given ontology: "every owl:Class", the first
 * root filter shipped in the bin source creators, its two rdfs:type typo variants, and the current
 * root query pasted by hand into a few sources. All of them are what an empty topClassFilter now
 * produces, so they carry no information and are reset.
 */
const genericTopClassFilters = [
    "?topConcept rdf:type owl:Class .",
    "?topConcept rdf:type owl:Class . ?topConcept rdfs:subClassOf ?superClass filter (isUri(?superClass) && not exists{?superClass rdf:type owl:Class })",
    "?topConcept rdfs:subClassOf ?superClass filter( not exists {?superClass  rdfs:type <http://www.w3.org/2002/07/owl#Class>})",
    "?topConcept rdfs:subClassOf ?superClass. filter( not exists {?superClass  rdfs:type <http://www.w3.org/2002/07/owl#Class>})",
    `{{?topConcept rdf:type owl:Class.
    ?topConcept rdfs:subClassOf ?superClass
    filter (isUri(?superClass) &&  not exists{?superClass rdf:type owl:Class })
    OPTIONAL{?topConcept rdfs:label ?topConceptLabel.}

    }MINUS
  {
    ?topConcept rdfs:subClassOf ?superClass.
      ?superClass rdf:type ?superClassType filter(?superClassType=owl:Restriction).

    }
}`,
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
