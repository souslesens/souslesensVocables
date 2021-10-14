declare function getSources(): Promise<Source[]>;
export declare function putSources(body: Source[]): Promise<Source[]>;
export declare type Source = {
    id: string;
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
};
export declare const defaultSource: {
    name: string;
    id: string;
    type: string;
    graphUri: never[];
    sparql_server: string;
    controller: string;
    topClassFilter: string;
    schemaType: string;
    dataSource: {
        type: string;
        connection: string;
        dbName: string;
        table_schema: string;
        local_dictionary: {
            table: string;
            idColumn: string;
            labelColumn: string;
        };
    };
    schema: null;
    color: string;
};
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
export { getSources };
