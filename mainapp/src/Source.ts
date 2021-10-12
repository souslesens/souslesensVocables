

async function getSources(): Promise<Source[]> {

    const response = await fetch('/sources');
    const json = await response.json();
    const entries: [string, SourceJson][] = Object.entries(json)
    const decodedEntries = entries.map(([key, val]) => decodeSource(key, val))

    return decodedEntries
}


const decodeSource = (name: string, source: SourceJson): Source => {
    return {
        name: name,
        type: source.type,
        graphUri: source.graphUri,
        sparql_server: source.sparql_server.url,
        controller: source.controller,
        topClassFilter: source.topClassFilter,
        schemaType: source.schemaType,
        dataSource: source.dataSource,
        schema: source.schema,
        color: source.color
    }
}

export type Source = {
    name: string;
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

interface SourceJson {
    type: string;
    graphUri: string[];
    sparql_server: SparqlServer;
    controller: string;
    topClassFilter: string;
    schemaType: string;
    dataSource: DataSource;
    schema: null;
    color: string;
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