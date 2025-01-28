import { ulid } from "ulid";
import { z } from "zod";

const endpoint = "/api/v1/admin/sources";
const userEndpoint = "/api/v1/sources";
const indicesEndpoint = "/api/v1/elasticsearch/indices";
const graphsEndpoint = "/api/v1/sparql/graphs";

type Response = { message: string; resources: ServerSource[] };

async function getSourcesForUser(): Promise<ServerSource[]> {
    const response = await fetch(userEndpoint);
    const json = (await response.json()) as Response;
    return mapSources(json.resources);
}

async function getSources(): Promise<ServerSource[]> {
    const response = await fetch(endpoint);
    const json = (await response.json()) as Response;
    return mapSources(json.resources);
}

const getGraphSize = (source: ServerSource, graphs: GraphInfo[] | null) => {
    const graphInfo = graphs?.find((g) => g.name == source.graphUri);
    return graphInfo === undefined ? 0 : Number.parseInt(graphInfo.count);
};

async function getIndices(): Promise<string[]> {
    const response = await fetch(indicesEndpoint);
    const json = (await response.json()) as string[];
    return json;
}

export interface GraphInfo {
    count: string;
    name: string;
}
async function getGraphs(): Promise<GraphInfo[]> {
    const response = await fetch(graphsEndpoint);
    const json = (await response.json()) as GraphInfo[];
    return json;
}

async function getMe(): Promise<string> {
    const response = await fetch("/api/v1/auth/whoami");
    const json = (await response.json()) as { user: { login: string } };
    return json.user.login;
}

export async function putSources(body: ServerSource[]): Promise<ServerSource[]> {
    const sourcesToObject = body.reduce((obj, item) => ({ ...obj, [item.name]: item }), {});
    const response = await fetch("/sources", { method: "put", body: JSON.stringify(sourcesToObject, null, "\t"), headers: { "Content-Type": "application/json" } });
    const json = (await response.json()) as Response;
    return mapSources(json.resources);
}

function mapSources(resources: ServerSource[]) {
    const sources = Object.entries(resources);
    const mapped_sources = sources
        .map(([key, val]) => decodeSource(key, val))
        .sort((source1: ServerSource, source2: ServerSource) => {
            const name1 = source1.name.toUpperCase();
            const name2 = source2.name.toUpperCase();
            if (name1 < name2) {
                return -1;
            }
            if (name1 > name2) {
                return 1;
            }
            return 0;
        });
    return mapped_sources;
}

export async function saveSource(source: ServerSource, edition: boolean) {
    try {
        let response = null;
        if (edition) {
            response = await fetch(endpoint + "/" + source.name, {
                method: "put",
                body: JSON.stringify(source, null, "\t"),
                headers: { "Content-Type": "application/json" },
            });
        } else {
            response = await fetch(endpoint, {
                method: "post",
                body: JSON.stringify({ [source.name]: source }, null, "\t"),
                headers: { "Content-Type": "application/json" },
            });
        }
        const { message, resources } = (await response.json()) as Response;
        if (response.status === 200) {
            if (edition) {
                const sources: ServerSource[] = await getSources();
                return { status: 200, message: mapSources(sources) };
            }
            return { status: 200, message: mapSources(resources) };
        }
        return { status: response.status, message: message };
    } catch (e) {
        return { status: 500, message: e };
    }
}

export async function deleteSource(source: ServerSource) {
    try {
        const response = await fetch(`${endpoint}/${source.name}`, { method: "delete" });
        const { message, resources } = (await response.json()) as Response;

        if (response.status === 200) {
            return { status: 200, message: mapSources(resources) };
        }
        return { status: response.status, message: message };
    } catch (e) {
        return { status: 500, message: e };
    }
}

const decodeSource = (key: string, source: ServerSource): ServerSource => {
    return ServerSourceSchema.parse({ ...source, name: source.name ?? key });
};

export type ServerSource = z.infer<typeof ServerSourceSchema>;
export type InputSource = z.infer<typeof InputSourceSchema>;

export const SparqlServerSchema = z
    .object({
        url: z.string().default("_default"),
        method: z.string().default("POST"),
        headers: z.record(z.string(), z.string()).default({}),
    })
    .default({ url: "", method: "", headers: {} });

const SourcePredicatesSchema = z
    .object({
        broaderPredicate: z.string().default(""),
        lang: z.string().default(""),
    })
    .default({ broaderPredicate: "", lang: "" });

const LocalDictionarySchema = z.object({
    table: z.string().default(""),
    idColumn: z.string().default(""),
    labelColumn: z.string().default(""),
});
export type LocalDictionary = z.infer<typeof LocalDictionarySchema>;

const defaultDataSource: DataSource = {
    type: "",
    connection: "_default",
    dbName: "",
    table_schema: "",
    local_dictionary: { table: "", idColumn: "", labelColumn: "" },
};

const dataSourceSchema = z
    .object({
        type: z.string().default(""),
        connection: z.string().default("_default"),
        dbName: z.string().default(""),
        table_schema: z.string().default(""),
        local_dictionary: LocalDictionarySchema.nullable(),
    })
    .default(defaultDataSource);

export const ServerSourceSchema = z.object({
    id: z.string().default(ulid()),
    name: z.string().default(""),
    prefix: z
        .string()
        .default("")
        .refine((val) => val.match(/^([a-z0-9][a-z0-9-]*){0,10}$/i), { message: "Can only contain alphanum and - chars" }),
    _type: z.string().optional(),
    graphUri: z.string().optional(),
    sparql_server: SparqlServerSchema,
    controller: z.string().default("Sparql_OWL"),
    topClassFilter: z.string().default("?topConcept rdf:type owl:Class ."),
    schemaType: z.string().default("OWL"),
    dataSource: dataSourceSchema.nullable(),
    schema: z.unknown().nullable(),
    editable: z.boolean().default(false),
    color: z.string().default(""),
    isDraft: z.boolean().default(false),
    allowIndividuals: z.boolean().default(false),
    predicates: SourcePredicatesSchema,
    group: z.string().default(""),
    owner: z.string().default(""),
    published: z.boolean().default(false),
    imports: z.array(z.string()).default([]),
    taxonomyPredicates: z.array(z.string()).default(["rdfs:subClassOf"]),
    accessControl: z.string().default(""),
});

const InputSourceSchemaBase = {
    id: z.string().default(ulid()),
    _type: z.string().optional(),
    graphUri: z.string().optional(),
    sparql_server: SparqlServerSchema,
    controller: z.string().optional(),
    topClassFilter: z.string().optional(),
    schemaType: z.string().optional(),
    dataSource: dataSourceSchema.nullable(),
    schema: z.unknown().nullable(),
    editable: z.boolean().optional(),
    color: z.string().default(""),
    isDraft: z.boolean().default(false),
    allowIndividuals: z.boolean().default(false),
    predicates: SourcePredicatesSchema,
    group: z
        .string()
        .nonempty({ message: "Required" })
        .min(3, { message: "3 chars min" })
        .refine((val) => val.match(/^[^/]/), { message: "Cannot start with /" }),
    owner: z.string().default(""),
    published: z.boolean().default(false),
    imports: z.array(z.string()).default([]),
    taxonomyPredicates: z.array(z.string()).default(["rdfs:subClassOf"]),
};

export const InputSourceSchema = z.object(InputSourceSchemaBase);

export const InputSourceSchemaCreate = z.object({
    ...InputSourceSchemaBase,
    name: z
        .string()
        .nonempty({ message: "Required" })
        .refine((val) => val !== "admin", { message: "Name can't be admin" })
        .refine((val) => val.match(/.{2,254}/i), { message: "Name can only contain between 2 and 255 chars" })
        .refine((val) => val.match(/^[a-z0-9]/i), { message: "Name have to start with alphanum char" })
        .refine((val) => val.match(/^[a-z0-9][a-z0-9-_]{1,253}$/i), { message: "Name can only contain alphanum and - or _ chars" }),
});

export const sourceHelp = {
    name: "The source name can only contain alphanum and - or _ chars and must be unique",
    prefix: "Prefix used for the GraphUri. Must contain lowercase alphanum chars and -",
    graphUri: "Graph URI is mandatory when using the default SPARQL server",
    sparql_server: {
        url: "_default if using the default SPARQL server, else, the URL of the SPARQL server",
        method: "The HTTP method (GET or POST) used to request the SPARQL server. The default SPARQL server needs POST",
        headers: { key: "Name of HTTP header added to the SPARQL request", value: "Value of the HTTP header added to the SPARQL request" },
    },
    controller: "OWL uses subClassOf for taxonomy queries, SKOS uses narower and broader",
    topClassFilter: "SPARQL query used to get the top concepts",
    schemaType: "DEPRECATED, will be removed in future version",
    dataSource: "",
    schema: "",
    editable: "The source can be modified according to the user profile (read & write)",
    color: "",
    isDraft: "Mark the source as draft",
    allowIndividuals: "Allows user to create named individuals",
    predicates: "",
    group: "Group and subgroups (AAA/BBB) used to order the sources",
    imports: "List of imported sources",
    taxonomyPredicates: "List of properties used to draw the taxonomies of classes and named individuals in lineage actions",
    published: "The source will be visible by all user (with right permission to see it)",
    owner: "User that own the source. The user will have all right on the source.",
};

export const defaultSource = (id: string): ServerSource => {
    return ServerSourceSchema.parse({
        _type: "source",
        id: id,
        sparql_server: SparqlServerSchema.parse({ headers: {} }),
    });
};

export interface DataSource {
    type: string;
    connection: string;
    dbName: string;
    table_schema: string;
    local_dictionary: LocalDictionary | null;
}

interface CommonSource {
    id: string;
    graphUri: string;
    sparql_server: { url: string; method: string; headers: { key: string; value: string }[] };
    color: string;
    controller: string;
    topClassFilter: string;
}

interface SkosSpecificSource {
    editable: boolean;
    isDraft: boolean;
    predicates: { broaderPredicate: string; lang: string };
}

//Data modeling source.json could be better

export type Knowledge_GraphSource = CommonSource & DataSource;

export type SkosSource = CommonSource & SkosSpecificSource;

export type _Source = Knowledge_GraphSource | SkosSource;

export { getSources, getSourcesForUser, getIndices, getGraphs, getMe, defaultDataSource, getGraphSize };
