/// <reference types="react" />
declare const SourcesTable: () => JSX.Element;
declare const enum Type {
    UserClickedModal = 0,
    UserUpdatedField = 1,
    ResetSource = 2,
    UserAddedGraphUri = 3,
    UserClickedCheckBox = 4,
    UserUpdatedPredicates = 5,
    UserClickedAddDataSource = 6,
    UserUpdatedDataSource = 7,
    UserUpdatedsparql_server = 8
}
declare const enum Mode {
    Creation = 0,
    Edition = 1
}
declare type Msg_ = {
    type: Type.UserClickedModal;
    payload: boolean;
} | {
    type: Type.UserUpdatedField;
    payload: {
        fieldname: string;
        newValue: string;
    };
} | {
    type: Type.ResetSource;
    payload: Mode;
} | {
    type: Type.UserAddedGraphUri;
    payload: string;
} | {
    type: Type.UserClickedCheckBox;
    payload: {
        checkboxName: string;
        value: boolean;
    };
} | {
    type: Type.UserUpdatedPredicates;
    payload: {
        broaderPredicate: string;
        lang: string;
    };
} | {
    type: Type.UserClickedAddDataSource;
    payload: boolean;
} | {
    type: Type.UserUpdatedDataSource;
    payload: {
        type: string[];
        table_schema: string;
        connection: string;
        dbName: string;
        local_dictionary: {
            table: string;
            labelColumn: string;
            idColumn: string;
        };
    };
} | {
    type: Type.UserUpdatedsparql_server;
    payload: {
        url: string;
        method: string;
        headers: string[];
    };
};
export { SourcesTable, Msg_, Type, Mode };
