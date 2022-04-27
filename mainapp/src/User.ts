import React from "react";
import { ulid } from "ulid";
import { failure, success } from "srd";
import { Msg } from "./Admin";
import { Msg_, Type, Mode } from "../src/Component/UsersTable";
const endpoint = "/api/v1/users";

async function getUsers(): Promise<User[]> {
    const response = await fetch(endpoint);
    const { resources } = (await response.json()) as { message: string; resources: User[] };
    return mapUsers(resources);
}
function mapUsers(resources: User[]) {
    const users: [string, UserJSON][] = Object.entries(resources);
    const mapped_users = users.map(([, val]) => decodeUser(val));
    return mapped_users;
}

async function putUsers(body: User[]): Promise<User[]> {
    const response = await fetch(endpoint, { method: "put", body: JSON.stringify(body, null, "\t"), headers: { "Content-Type": "application/json" } });
    const json = (await response.json()) as { message: string; resources: User[] };

    return mapUsers(json.resources);
}

async function saveUserBis(body: User, mode: Mode, updateModel: React.Dispatch<Msg>, updateLocal: React.Dispatch<Msg_>) {
    try {
        const response = await fetch(endpoint, {
            method: mode === Mode.Edition ? "put" : "post",
            body: JSON.stringify({ [body.id]: body }, null, "\t"),
            headers: { "Content-Type": "application/json" },
        });
        const { message, resources } = (await response.json()) as { message: string; resources: User[] };
        if (response.status === 200) {
            updateModel({ type: "ServerRespondedWithUsers", payload: success(mapUsers(resources)) });
            updateLocal({ type: Type.UserClickedModal, payload: false });
            updateLocal({ type: Type.ResetUser, payload: mode });
        } else {
            updateModel({ type: "ServerRespondedWithUsers", payload: failure(`${response.status}, ${message}`) });
        }
    } catch (e) {
        updateModel({ type: "ServerRespondedWithUsers", payload: failure(e) });
    }
}

async function deleteUser(user: User, updateModel: React.Dispatch<Msg>) {
    try {
        const response = await fetch(`${endpoint}/${user.id}`, { method: "delete" });
        const { message, resources } = (await response.json()) as { message: string; resources: User[] };
        if (response.status === 200) {
            updateModel({ type: "ServerRespondedWithUsers", payload: success(mapUsers(resources)) });
        } else {
            updateModel({ type: "ServerRespondedWithUsers", payload: failure(`${response.status}, ${message}`) });
        }
    } catch (e) {
        updateModel({ type: "ServerRespondedWithUsers", payload: failure(e) });
    }
}

function restoreUsers(updateModel: React.Dispatch<Msg>, setModal: React.Dispatch<React.SetStateAction<boolean>>) {
    return () => {
        getUsers()
            .then((person) => updateModel({ type: "ServerRespondedWithUsers", payload: success(person) }))
            .then(() => setModal(false))
            .catch((err: { msg: string }) => updateModel({ type: "ServerRespondedWithUsers", payload: failure(err.msg) }));
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
        source: user.source ? user.source : "json",
        _type: "user",
    };
};

type UserJSON = { id?: string; login: string; password: string; groups: string[]; source?: string };

type User = { id: string; _type: string; login: string; password: string; groups: string[]; source: string };

type UserAccount = Record<string, User>;
const newUser = (key: string): User => {
    return { id: key, _type: "user", login: "", password: "", groups: [], source: "json" };
};

export { getUsers, UserAccount, newUser, saveUserBis as putUsersBis, restoreUsers, deleteUser, putUsers, User };
