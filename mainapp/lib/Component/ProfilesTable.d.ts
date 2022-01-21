/// <reference types="react" />
declare const ProfilesTable: () => JSX.Element;
declare const enum Type {
    UserClickedModal = 0,
    UserUpdatedField = 1,
    ResetProfile = 2,
    UserClickedCheckAll = 3,
    UserUpdatedBlenderLevel = 4
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
    type: Type.ResetProfile;
    payload: Mode;
} | {
    type: Type.UserClickedCheckAll;
    payload: {
        fieldname: string;
        value: boolean;
    };
} | {
    type: Type.UserUpdatedBlenderLevel;
    payload: number;
};
export { ProfilesTable, Mode, Msg_, Type };
