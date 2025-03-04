import { ulid } from "ulid";
import { failure, success } from "srd";
import { Msg } from "./Admin";
import { Dispatch, SetStateAction } from "react";
const endpoint = "/api/v1/admin/users";

async function getUsers(): Promise<User[]> {
    const response = await fetch(endpoint);
    const { resources } = (await response.json()) as { message: string; resources: User[] };
    return mapUsers(resources);
}
function mapUsers(resources: User[]) {
    const users: [string, UserJSON][] = Object.entries(resources);
    const mapped_users = users
        .map(([, val]) => decodeUser(val))
        .sort((user1: User, user2: User) => {
            const name1 = user1.login.toUpperCase();
            const name2 = user2.login.toUpperCase();
            if (name1 < name2) {
                return -1;
            }
            if (name1 > name2) {
                return 1;
            }
            return 0;
        });
    return mapped_users;
}

async function putUsers(body: User[]): Promise<User[]> {
    const response = await fetch(endpoint, { method: "put", body: JSON.stringify(body, null, "\t"), headers: { "Content-Type": "application/json" } });
    const json = (await response.json()) as { message: string; resources: User[] };

    return mapUsers(json.resources);
}

async function saveUserBis(body: User, create: boolean, updateModel: Dispatch<Msg>) {
    try {
        const response = await fetch(endpoint, {
            method: create ? "post" : "put",
            body: JSON.stringify({ [body.id]: body }, null, "\t"),
            headers: { "Content-Type": "application/json" },
        });
        const { message, resources } = (await response.json()) as { message: string; resources: User[] };
        if (response.status === 200) {
            updateModel({ type: "users", payload: success(mapUsers(resources)) });
            return Promise.resolve();
        } else {
            updateModel({ type: "users", payload: failure(`${response.status}, ${message}`) });
            return Promise.reject(Error(message));
        }
    } catch (e) {
        updateModel({ type: "users", payload: failure(e as string) });
        return Promise.reject(Error(e as string));
    }
}

async function deleteUser(user: User, updateModel: Dispatch<Msg>) {
    try {
        const response = await fetch(`${endpoint}/${user.login}`, { method: "delete" });
        const { message, resources } = (await response.json()) as { message: string; resources: User[] };
        if (response.status === 200) {
            updateModel({ type: "users", payload: success(mapUsers(resources)) });
        } else {
            updateModel({ type: "users", payload: failure(`${response.status}, ${message}`) });
        }
    } catch (e) {
        updateModel({ type: "users", payload: failure(e as string) });
    }
}

function restoreUsers(updateModel: Dispatch<Msg>, setModal: Dispatch<SetStateAction<boolean>>) {
    return () => {
        getUsers()
            .then((person) => updateModel({ type: "users", payload: success(person) }))
            .then(() => setModal(false))
            .catch((err: { msg: string }) => updateModel({ type: "users", payload: failure(err.msg) }));
    };
}

const decodeUser = (user: UserJSON): User => {
    // TODO: (06/10/21 9:45 am) Uniquely identify users
    // for now client generates ulid if user.key is null, it should be generated server-side
    // As users.json doesn't contain key field, we should check for the presence of the field instead of whether the field is null
    return {
        id: user.id ? user.id : ulid(),
        login: user.login,
        password: user.password,
        groups: user.groups,
        source: user.source ? user.source : "database",
        allowSourceCreation: user.allowSourceCreation,
        maxNumberCreatedSource: user.maxNumberCreatedSource,
        _type: "user",
    };
};

type UserJSON = { id?: string; login: string; password: string; groups: string[]; source?: string; allowSourceCreation: boolean; maxNumberCreatedSource: number };

export type User = { id: string; _type: string; login: string; password: string; groups: string[]; source: string; allowSourceCreation: boolean; maxNumberCreatedSource: number };

const newUser = (key: string): User => {
    return { id: key, _type: "user", login: "", password: "", groups: [], source: "database", allowSourceCreation: false, maxNumberCreatedSource: 5 };
};

export { getUsers, newUser, saveUserBis as putUsersBis, restoreUsers, deleteUser, putUsers };
