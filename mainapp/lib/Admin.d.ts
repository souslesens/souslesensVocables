import * as React from "react";
import { RD } from 'srd';
import { User as User } from './User';
import { Profile } from './Profile';
import { Source } from "./Source";
import { Config } from "./Config";
declare type Model = {
    users: RD<string, User[]>;
    profiles: RD<string, Profile[]>;
    sources: RD<string, Source[]>;
    config: RD<string, Config>;
    isModalOpen: boolean;
    currentEditionTab: EditionTab;
};
declare type EditionTab = 'UsersEdition' | 'ProfilesEdition' | 'SourcesEdition';
declare type UpadtedFieldPayload = {
    id: string;
    fieldName: string;
    newValue: string;
};
declare function useModel(): {
    model: Model;
    updateModel: React.Dispatch<Msg>;
};
declare type Msg = {
    type: 'ServerRespondedWithUsers';
    payload: RD<string, User[]>;
} | {
    type: 'ServerRespondedWithProfiles';
    payload: RD<string, Profile[]>;
} | {
    type: 'ServerRespondedWithSources';
    payload: RD<string, Source[]>;
} | {
    type: 'ServerRespondedWithConfig';
    payload: RD<string, Config>;
} | {
    type: 'UserUpdatedField';
    payload: UpadtedFieldPayload;
} | {
    type: 'UserClickedSaveChanges';
    payload: {};
} | {
    type: 'UserChangedModalState';
    payload: boolean;
} | {
    type: 'UserClickedAddUser';
    payload: string;
} | {
    type: 'UserClickedNewTab';
    payload: number;
};
declare const Admin: () => JSX.Element;
export default Admin;
export { Msg, useModel };
