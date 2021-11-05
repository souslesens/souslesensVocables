import { ulid } from 'ulid'


async function getSources(): Promise<Source[]> {

    const response = await fetch('/sources');
    const json = await response.json();
    const entries: [string, SourceJson][] = Object.entries(json)
    const decodedEntries = entries.map(([name, val]) => decodeSource(name, val))


    return decodedEntries
}

export async function putSources(body: Source[]): Promise<Source[]> {

    const sourcesToObject = body.reduce((obj, item) => ({ ...obj, [item.name]: item }), {});
    const response = await fetch("/sources", { method: "put", body: JSON.stringify(sourcesToObject, null, '\t'), headers: { 'Content-Type': 'application/json' } });
    const json = await response.json();
    const entries: [string, SourceJson][] = Object.entries(json);
    const decodedEntries = entries.map(([key, val]) => decodeSource(key, val))

    return decodedEntries
}


const decodeSource = (name: string, source: SourceJson): Source => {

    const decodedSource = {
        name: name,
        _type: 'source',
        id: source.id ? source.id : ulid(),
        type: source.type ? source.type : "missing type",
        graphUri: source.graphUri ? source.graphUri : "",
        sparql_server: source.sparql_server ? source.sparql_server : defaultSource("").sparql_server,
        controller: source.controller ? source.controller : "missing controller",
        topClassFilter: source.topClassFilter ? source.topClassFilter : "missing topClassFilter",
        schemaType: source.schemaType ? source.schemaType : "missing schema type",
        dataSource: source.dataSource ? source.dataSource : null,
        schema: source.schema ? source.schema : null,
        isDraft: source.isDraft ? source.isDraft : true,
        editable: source.editable ? source.editable : true,
        color: source.color ? source.color : "default color",
        predicates: source.predicates ? source.predicates : defaultSource(ulid()).predicates,
        group: source.group ? source.group : "",
        imports: source.imports ? source.imports : []
    }
    return decodedSource
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
    predicates: { broaderPredicate: string, lang: string };
    group: string;
    imports: string[];
}

export const defaultSource = (id: string): Source => {
    return ({
        name: "",
        _type: 'source',
        id: id,
        type: "",
        graphUri: "",
        sparql_server: { url: "", method: "Post", headers: [] },
        editable: true,
        controller: "",
        topClassFilter: "",
        schemaType: "",
        dataSource: null,
        schema: null,
        color: "",
        isDraft: true,
        predicates: { broaderPredicate: "", lang: "" },
        group: "",
        imports: []
    })
};

interface SourceJson {
    id?: string;
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
    predicates?: { broaderPredicate: string, lang: string };
    group?: string;
    imports?: string[];
}

interface CommonSource {
    id: string,
    graphUri: string[],
    sparql_server: { url: string, method: string, headers: string[] },
    color: string,
    controller: string,
    topClassFilter: string
}

interface SkosSpecificSource {
    editable: boolean,
    isDraft: boolean,
    predicates: { broaderPredicate: string, lang: string }
}

//Data modeling source.json could be better

export type Knowledge_GraphSource = CommonSource & DataSource

export type SkosSource = CommonSource & SkosSpecificSource

export type _Source = Knowledge_GraphSource | SkosSource

export interface DataSource {
    type: string;
    connection: string;
    dbName: string;
    table_schema: string;
    local_dictionary: LocalDictionary;
}

const defaultDataSource = {
    type: "",
    connection: "_default",
    dbName: "",
    table_schema: "",
    local_dictionary: { table: "", idColumn: "", labelColumn: "" }
}

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

export { getSources, defaultDataSource }

