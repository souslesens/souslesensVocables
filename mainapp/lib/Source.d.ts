declare function getSources(): Promise<Source[]>;
export declare function putSources(body: Source[]): Promise<Source[]>;
export declare type Source = {
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
};
export declare const defaultSource: (id: string) => Source;
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
