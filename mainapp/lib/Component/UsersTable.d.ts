declare const UsersTable: () => JSX.Element;
declare const enum Type {
    UserClickedModal = 0,
    UserUpdatedField = 1,
    ResetUser = 2
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
    type: Type.ResetUser;
    payload: Mode;
};
export { UsersTable, Msg_, Type, Mode };
