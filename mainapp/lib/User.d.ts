/// <reference types="react" />
import { Msg } from './Admin';
import { Msg_, Mode } from '../src/Component/UsersTable';
declare function getUsers(url: string): Promise<User[]>;
declare function putUsers(url: string, body: User[]): Promise<User[]>;
declare function saveUserBis(body: User, mode: Mode, updateModel: React.Dispatch<Msg>, updateLocal: React.Dispatch<Msg_>): Promise<void>;
declare function deleteUser(users: User[], user: User, updateModel: React.Dispatch<Msg>, setModal?: React.Dispatch<React.SetStateAction<boolean>>): () => void;
declare function saveUser(updateModel: React.Dispatch<Msg>, users: User[], user: User, localUser: User, setModal: React.Dispatch<React.SetStateAction<boolean>>): () => void;
declare function restoreUsers(updateModel: React.Dispatch<Msg>, setModal: React.Dispatch<React.SetStateAction<boolean>>): () => void;
declare type User = {
    id: string;
    _type: string;
    login: string;
    password: string;
    groups: string[];
    source: string;
};
declare const newUser: (key: string) => User;
export { getUsers, newUser, saveUserBis as putUsersBis, restoreUsers, saveUser, deleteUser, putUsers, User };
