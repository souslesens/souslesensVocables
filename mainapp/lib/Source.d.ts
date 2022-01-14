import { Mode, Msg_ } from "./Component/SourcesTable";
import { Msg } from './Admin';
import React from 'react';
declare function getSources(): Promise<Source[]>;
export declare function putSources(body: Source[]): Promise<Source[]>;
export declare function saveSource(body: Source, mode: Mode, updateModel: React.Dispatch<Msg>, updateLocal: React.Dispatch<Msg_>): Promise<void>;
export declare function deleteSource(source: Source, updateModel: React.Dispatch<Msg>): Promise<void>;
export declare type Source = {
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
    predicates: {
        broaderPredicate: string;
        lang: string;
    };
    group: string;
    imports: string[];
};
export declare const defaultSource: (id: string) => Source;
interface CommonSource {
    id: string;
    graphUri: string[];
    sparql_server: {
        url: string;
        method: string;
        headers: string[];
    };
    color: string;
    controller: string;
    topClassFilter: string;
}
interface SkosSpecificSource {
    editable: boolean;
    isDraft: boolean;
    predicates: {
        broaderPredicate: string;
        lang: string;
    };
}
export declare type Knowledge_GraphSource = CommonSource & DataSource;
export declare type SkosSource = CommonSource & SkosSpecificSource;
export declare type _Source = Knowledge_GraphSource | SkosSource;
export interface DataSource {
    type: string[];
    connection: string;
    dbName: string;
    table_schema: string;
    local_dictionary: LocalDictionary;
}
declare const defaultDataSource: DataSource;
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
