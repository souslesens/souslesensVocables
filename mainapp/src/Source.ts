import { ulid } from "ulid";
import { Mode, Type, Msg_ } from "./Component/SourcesTable";
import { failure, success } from "srd";
import { Msg } from "./Admin";
import React from "react";

const endpoint = "/api/v1/sources";

type Response = { message: string; resources: SourceJson[] };

async function getSources(): Promise<Source[]> {
    const response = await fetch(endpoint);
    const json = (await response.json()) as Response;
    return mapSources(json.resources);
}

export async function putSources(body: Source[]): Promise<Source[]> {
    const sourcesToObject = body.reduce((obj, item) => ({ ...obj, [item.name]: item }), {});
    const response = await fetch("/sources", { method: "put", body: JSON.stringify(sourcesToObject, null, "\t"), headers: { "Content-Type": "application/json" } });
    const json = (await response.json()) as Response;
    return mapSources(json.resources);
}
function mapSources(resources: SourceJson[]) {
    const sources: [string, SourceJson][] = Object.entries(resources);
    const mapped_users = sources.map(([key, val]) => decodeSource(key, val));
    return mapped_users;
}

export async function saveSource(body: Source, mode: Mode, updateModel: React.Dispatch<Msg>, updateLocal: React.Dispatch<Msg_>) {
    try {
        const response = await fetch(endpoint, {
            method: mode === Mode.Edition ? "put" : "post",
            body: JSON.stringify({ [body.id]: body }, null, "\t"),
            headers: { "Content-Type": "application/json" },
        });
        const { message, resources } = (await response.json()) as Response;
        if (response.status === 200) {
            updateModel({ type: "ServerRespondedWithSources", payload: success(mapSources(resources)) });
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

export async function deleteSource(source: Source, updateModel: React.Dispatch<Msg>) {
    try {
        const response = await fetch(`${endpoint}/${source.id}`, { method: "delete" });
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

const decodeSource = (key: string, source: SourceJson): Source => {
    const decodedSource = {
        name: source.name ? source.name : key,
        _type: "source",
        id: source.id ? source.id : ulid(),
        type: source.type ? source.type : "missing type",
        graphUri: source.graphUri ? source.graphUri : "",
        sparql_server: source.sparql_server ? source.sparql_server : defaultSource("").sparql_server,
        controller: source.controller ? source.controller : controllerDefault(source.schemaType),
        topClassFilter: source.topClassFilter ? source.topClassFilter : "missing topClassFilter",
        schemaType: source.schemaType ? source.schemaType : "missing schema type",
        dataSource: source.dataSource ? source.dataSource : null,
        schema: source.schema ? source.schema : null,
        isDraft: source.isDraft ? source.isDraft : false,
        editable: source.editable ? source.editable : true,
        color: source.color ? source.color : "default color",
        predicates: source.predicates ? source.predicates : defaultSource(ulid()).predicates,
        group: source.group ? source.group : "",
        imports: source.imports ? source.imports : [],
    };
    return decodedSource;
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

export type Source = {
    id: string;
    name: string;
    _type: string;
    type: string;
    graphUri: string;
    sparql_server: SparqlServer;
    controller: string;
    topClassFilter: string;
    schemaType: string;
    dataSource: null | DataSource;
    schema: null;
    editable: boolean;
    color: string;
    isDraft: boolean;
    predicates: { broaderPredicate: string; lang: string };
    group: string;
    imports: string[];
};

export const defaultSource = (id: string): Source => {
    return {
        name: "",
        _type: "source",
        id: id,
        type: "",
        graphUri: "",
        sparql_server: { url: "_default", method: "Post", headers: [] },
        editable: true,
        controller: "",
        topClassFilter: "",
        schemaType: "",
        dataSource: null,
        schema: null,
        color: "",
        isDraft: false,
        predicates: { broaderPredicate: "", lang: "" },
        group: "",
        imports: [],
    };
};

interface SourceJson {
    id?: string;
    name?: string;
    type?: string;
    graphUri?: string;
    sparql_server?: SparqlServer;
    controller?: string;
    topClassFilter?: string;
    schemaType?: string;
    editable?: boolean;
    isDraft?: boolean;
    dataSource?: null | DataSource;
    schema?: null;
    color?: string;
    predicates?: { broaderPredicate: string; lang: string };
    group?: string;
    imports?: string[];
}

interface CommonSource {
    id: string;
    graphUri: string[];
    sparql_server: { url: string; method: string; headers: string[] };
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

export interface DataSource {
    type: string[];
    connection: string;
    dbName: string;
    table_schema: string;
    local_dictionary: LocalDictionary;
}

const defaultDataSource: DataSource = {
    type: [],
    connection: "_default",
    dbName: "",
    table_schema: "",
    local_dictionary: { table: "", idColumn: "", labelColumn: "" },
};

interface LocalDictionary {
    table: string;
    idColumn: string;
    labelColumn: string;
}

interface SparqlServer {
    url: string;
    method: string;
    headers: string[];
}

export { getSources, defaultDataSource };
