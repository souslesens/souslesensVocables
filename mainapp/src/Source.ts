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
    console.log("j'essaie de décoder", source)
    const decodedSource = {
        name: name,
        _type: 'source',
        id: source.id ? source.id : ulid(),
        type: source.type ? source.type : "missing type",
        graphUri: source.graphUri ? source.graphUri : [],
        sparql_server: source.sparql_server ? source.sparql_server.url : "missing sparql server",
        controller: source.controller ? source.controller : "missing controller",
        topClassFilter: source.topClassFilter ? source.topClassFilter : "missing topClassFilter",
        schemaType: source.schemaType ? source.schemaType : "missing schema type",
        dataSource: source.dataSource ? source.dataSource : defaultSource(ulid()).dataSource,
        schema: source.schema ? source.schema : null,
        color: source.color ? source.color : "default color"
    }
    console.log("Voici la version décodée", decodedSource)
    return decodedSource
}

export type Source = {
    id: string;
    name: string;
    _type: string;
    type: string;
    graphUri: string[];
    sparql_server: string;
    controller: string;
    topClassFilter: string;
    schemaType: string;
    dataSource: DataSource;
    schema: null;
    color: string;
}

export const defaultSource = (id: string): Source => {
    return ({
        name: "",
        _type: 'source',
        id: id,
        type: "",
        graphUri: [],
        sparql_server: "",
        controller: "",
        topClassFilter: "",
        schemaType: "",
        dataSource: {
            type: "",
            connection: "",
            dbName: "",
            table_schema: "",
            local_dictionary: {
                table: "",
                idColumn: "",
                labelColumn: "",
            }
        },
        schema: null,
        color: ""
    })
};

interface SourceJson {
    id?: string;
    type?: string;
    graphUri?: string[];
    sparql_server?: SparqlServer;
    controller?: string;
    topClassFilter?: string;
    schemaType?: string;
    dataSource?: DataSource;
    schema?: null;
    color?: string;
}

interface DataSource {
    type: string;
    connection: string;
    dbName: string;
    table_schema: string;
    local_dictionary: LocalDictionary;
}

interface LocalDictionary {
    table: string;
    idColumn: string;
    labelColumn: string;
}

interface SparqlServer {
    url: string;
}

export { getSources }

