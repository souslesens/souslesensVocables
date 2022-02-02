
import { ulid } from 'ulid';
import { SRD, RD, notAsked, loading, failure, success } from 'srd'
import { Msg } from './Admin'


async function getUsers(url: string): Promise<User[]> {

    const response = await fetch(url);
    const json = await response.json();
    const users: [string, UserJSON][] = Object.entries(json);
    const mapped_users = users.map(([key, val]) => decodeUser(val))

    return mapped_users
}

async function putUsers(url: string, body: User[]): Promise<User[]> {

    const usersToObject = body.reduce((obj, item) => ({ ...obj, [item.id]: item }), {});
    const response = await fetch(url, { method: "put", body: JSON.stringify(usersToObject, null, '\t'), headers: { 'Content-Type': 'application/json' } });
    const json = await response.json();
    const users: [string, UserJSON][] = Object.entries(json);
    const decoded_users = users.map(([key, val]) => decodeUser(val))

    return decoded_users
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

const newUser = (key: string): User => { return ({ id: key, _type: 'user', login: '', password: '', groups: [], source: 'json' }) }



export { getUsers, newUser, restoreUsers, saveUser, deleteUser, putUsers, User }


