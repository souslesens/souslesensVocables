import { ulid } from "ulid";
import { Mode, Type, Msg_ } from "./Component/SourcesTable";
import { failure, success } from "srd";
import { Msg } from "./Admin";
import React from "react";
import * as z from "zod";

const endpoint = "/api/v1/sources";

type Response = { message: string; resources: ServerSource[] };

async function getSources(): Promise<ServerSource[]> {
    const response = await fetch(endpoint);
    const json = (await response.json()) as Response;
    return mapSources(json.resources);
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

export async function saveSource(body: InputSource, mode: Mode, updateModel: React.Dispatch<Msg>, updateLocal: React.Dispatch<Msg_>) {
    try {
        let response = null;
        if (mode === Mode.Edition) {
            response = await fetch(endpoint + "/" + body.name, {
                method: "put",
                body: JSON.stringify(body, null, "\t"),
                headers: { "Content-Type": "application/json" },
            });
        } else {
            response = await fetch(endpoint, {
                method: "post",
                body: JSON.stringify({ [body.name]: body }, null, "\t"),
                headers: { "Content-Type": "application/json" },
            });
        }
        const { message, resources } = (await response.json()) as Response;
        if (response.status === 200) {
            if (mode === Mode.Edition) {
                const sources: ServerSource[] = await getSources();
                updateModel({ type: "ServerRespondedWithSources", payload: success(mapSources(sources)) });
            } else {
                updateModel({ type: "ServerRespondedWithSources", payload: success(mapSources(resources)) });
            }
            updateLocal({ type: Type.UserClickedModal, payload: false });
            updateLocal({ type: Type.ResetSource, payload: mode });
        } else {
            updateModel({ type: "ServerRespondedWithSources", payload: failure(`${response.status}, ${message}`) });
        }
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        updateModel({ type: "ServerRespondedWithSources", payload: failure(`Uncatched : ${e}`) });
    }
}

export async function deleteSource(source: InputSource, updateModel: React.Dispatch<Msg>) {
    try {
        const response = await fetch(`${endpoint}/${source.name}`, { method: "delete" });
        const { message, resources } = (await response.json()) as Response;
        if (response.status === 200) {
            updateModel({ type: "ServerRespondedWithSources", payload: success(mapSources(resources)) });
        } else {
            updateModel({ type: "ServerRespondedWithSources", payload: failure(`${response.status}, ${message}`) });
        }
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        updateModel({ type: "ServerRespondedWithSources", payload: failure(`Unhandled Error : ${e}`) });
    }
}

const decodeSource = (key: string, source: ServerSource): ServerSource => {
    return ServerSourceSchema.parse({ ...source, name: source.name ?? key });
};

function controllerDefault(schemaType: string | undefined): string {
    if (schemaType === "OWL") {
        return "Sparql_OWL";
    } else if (schemaType === "SKOS") {
        return "Sparql_SKOS";
    } else {
        return "default controller";
    }
}

export type ServerSource = z.infer<typeof ServerSourceSchema>;
export type InputSource = z.infer<typeof InputSourceSchema>;

export const SparqlServerSchema = z
    .object({
        url: z.string().default("_default"),
        method: z.string().default("GET"),
        headers: z.array(z.object({ key: z.string(), value: z.string() })),
    })
    .default({ url: "", method: "", headers: [] });

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
    _type: z.string().optional(),
    graphUri: z.string().optional(),
    sparql_server: SparqlServerSchema,
    controller: z.string().default("Sparql_OWL"),
    topClassFilter: z.string().default("?topConcept rdf:type owl:Class ."),
    schemaType: z.string().default("OWL"),
    dataSource: dataSourceSchema.nullable(),
    schema: z.unknown().nullable(),
    editable: z.boolean().default(true),
    color: z.string().default(""),
    isDraft: z.boolean().default(false),
    allowIndividuals: z.boolean().default(false),
    predicates: SourcePredicatesSchema,
    group: z.string().default(""),
    imports: z.array(z.string()).default([]),
    taxonomyPredicates: z.array(z.string()).default(["rdfs:subClassOf"]),
});

export const InputSourceSchema = z.object({
    id: z.string().default(ulid()),
    name: z
        .string()
        .nonempty({ message: "Required" })
        .refine((val) => val !== "admin", { message: "Name can't be admin" })
        .refine((val) => val.match(/.{2,254}/i), { message: "Name can only contain between 2 and 255 chars" })
        .refine((val) => val.match(/^[a-z0-9]/i), { message: "Name have to start with alphanum char" })
        .refine((val) => val.match(/^[a-z0-9][a-z0-9-_]{1,253}$/i), { message: "Name can only contain alphanum and - or _ chars" }),

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
    group: z.string().min(3, { message: "Required, 3 chars min" }),
    imports: z.array(z.string()).default([]),
    taxonomyPredicates: z.array(z.string()).default(["rdfs:subClassOf"]),
});

export const defaultSource = (id: string): ServerSource => {
    return ServerSourceSchema.parse({
        _type: "source",
        id: id,
        sparql_server: SparqlServerSchema.parse({ headers: [] }),
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

export { getSources, defaultDataSource };
