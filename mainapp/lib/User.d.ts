/// <reference types="react" />
import { Msg } from './Admin';
declare function getUsers(url: string): Promise<User[]>;
declare function putUsers(url: string, body: User[]): Promise<User[]>;
declare function deleteUser(users: User[], user: User, updateModel: React.Dispatch<Msg>, setModal?: React.Dispatch<React.SetStateAction<boolean>>): () => void;
declare function saveUser(updateModel: React.Dispatch<Msg>, users: User[], user: User, localUser: User, setModal: React.Dispatch<React.SetStateAction<boolean>>): () => void;
declare function restoreUsers(updateModel: React.Dispatch<Msg>, setModal: React.Dispatch<React.SetStateAction<boolean>>): () => void;
declare type User = {
    key: string;
    login: string;
    password: string;
    groups: string[];
};
declare const newUser: (key: string) => User;
export { getUsers, newUser, restoreUsers, saveUser, deleteUser, putUsers, User };
