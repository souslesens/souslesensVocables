type Source = {
    name: string;
    _type: string;
    id: string;
    type: string;
    graphUri: string;
    graphDownloadUrl?: string;
    sparql_server: {
        url: string;
        method: string;
        headers: string[];
    };
    controller: string;
    topClassFilter: string;
    schemaType: string;
    dataSource: string;
    schema: string;
    isDraft: boolean;
    editable: boolean;
    allowIndividuals: boolean;
    color: string;
    predicates: {
        broaderPredicate: string;
        lang: string;
    };
    group: string;
    imports: string[];
    taxonomyPredicates: string[];
    owner: string;
    published: boolean;
};

type SourceWithAccessControl = Source & {
    accessControl: string;
};

export { Source, SourceWithAccessControl };
