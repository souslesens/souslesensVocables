
import { ulid } from 'ulid';
import { SRD, RD, notAsked, loading, failure, success } from 'srd'
import { Msg } from './Admin'
import { Msg_, Type, Mode } from '../src/Component/UsersTable'
import { ThemeContext } from '@emotion/react';
const endpoint = "/api/v1/users"



async function getUsers(url: string): Promise<User[]> {
    const response = await fetch(endpoint);
    const { message, ressources } = await response.json();
    return mapUsers(ressources)
}
function mapUsers(ressources: any) {
    const users: [string, UserJSON][] = Object.entries(ressources);
    const mapped_users = users.map(([_, val]) => decodeUser(val));
    return mapped_users;
}

async function putUsers(url: string, body: User[]): Promise<User[]> {


    const usersToObject = body.reduce((obj, item) => ({ ...obj, [item.id]: item }), {});
    const response = await fetch(endpoint, { method: "put", body: JSON.stringify(body, null, '\t'), headers: { 'Content-Type': 'application/json' } });
    const json = await response.json();
    const users: [string, UserJSON][] = Object.entries(json);
    const decoded_users = users.map(([key, val]) => decodeUser(val))

    return decoded_users
}

async function saveUserBis(body: User, mode: Mode, updateModel: React.Dispatch<Msg>, updateLocal: React.Dispatch<Msg_>) {

    try {
        const response = await fetch(endpoint, { method: mode === Mode.Edition ? "put" : "post", body: JSON.stringify({ [body.id]: body }, null, '\t'), headers: { 'Content-Type': 'application/json' } });
        const { message, ressources } = await response.json()

        console.log("RESPONSE", ressources)

        updateModel({ type: 'ServerRespondedWithUsers', payload: success(mapUsers(ressources)) })
        updateLocal({ type: Type.UserClickedModal, payload: false })
        updateLocal({ type: Type.ResetUser, payload: mode })
    } catch (e) {
        console.log(e)
        updateModel({ type: 'ServerRespondedWithUsers', payload: failure(e) })
    }
    //.catch((e) => updateModel({ type: 'ServerRespondedWithUsers', payload: failure(e.msg) }))


}


function deleteUser(users: User[], user: User, updateModel: React.Dispatch<Msg>, setModal: React.Dispatch<React.SetStateAction<boolean>> = () => console.log("modal closed")) {
    const updatedUsers = users.filter(prevUsers => prevUsers.id !== user.id);
    return () => {
        putUsers('/users', updatedUsers)
            .then((users) => updateModel({ type: 'ServerRespondedWithUsers', payload: success(users) }))
            .then(() => setModal(false))
            .catch((err) => updateModel({ type: 'ServerRespondedWithUsers', payload: failure(err.msg) }));
    };
}

function saveUser(updateModel: React.Dispatch<Msg>, users: User[], user: User, localUser: User, setModal: React.Dispatch<React.SetStateAction<boolean>>) {
    return () => {

        updateModel({ type: 'UserClickedSaveChanges', payload: {} });
        putUsers('/users', users.map(u => u.id === user.id ? localUser : u))
            .then((person) => updateModel({ type: 'ServerRespondedWithUsers', payload: success(person) }))
            .then(() => setModal(false))
            .catch((err) => updateModel({ type: 'ServerRespondedWithUsers', payload: failure(err.msg) }));
    };
}

function restoreUsers(updateModel: React.Dispatch<Msg>, setModal: React.Dispatch<React.SetStateAction<boolean>>) {
    return () => {
        getUsers('/users')
            .then((person) => updateModel({ type: 'ServerRespondedWithUsers', payload: success(person) }))
            .then(() => setModal(false))
            .catch((err) => updateModel({ type: 'ServerRespondedWithUsers', payload: failure(err.msg) }));
    };
}


const encodeUser = (user: User): UserJSON => {
    return {
        login: user.login,
        password: user.password,
        groups: user.groups,
        source: user.source,
        id: user.id,

    }
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
        source: user.source ? user.source : 'json',
        _type: 'user'

    }
}

type UserJSON = { id?: string, login: string, password: string, groups: string[], source?: string }

type User = { id: string, _type: string, login: string, password: string, groups: string[], source: string }

const newUser = (key: string): User => { return ({ id: key, _type: 'user', login: '', password: '', groups: [], source: 'local' }) }



export { getUsers, newUser, saveUserBis as putUsersBis, restoreUsers, saveUser, deleteUser, putUsers, User }


