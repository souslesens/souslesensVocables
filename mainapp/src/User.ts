
import { ulid } from 'ulid';



async function getUsers(url: string): Promise<User[]> {

    const response = await fetch(url);
    const json = await response.json();
    const users: [string, UserJSON][] = Object.entries(json);
    const mapped_users = users.map(([key, val]) => decodeUser(val))

    return mapped_users
}

async function putUsers(url: string, body: User[]): Promise<User[]> {

    const usersToObject = body.reduce((obj, item) => ({ ...obj, [item.key]: item }), {});
    const response = await fetch(url, { method: "put", body: JSON.stringify(usersToObject, null, '\t'), headers: { 'Content-Type': 'application/json' } });
    const json = await response.json();
    const users: [string, UserJSON][] = Object.entries(json);
    const encode_users = users.map(([key, val]) => encodeUser(val))

    return encode_users
}



const encodeUser = (user: User): UserJSON => {
    return {
        login: user.login,
        password: user.password,
        groups: user.groups,
        key: user.key

    }
}

const decodeUser = (user: UserJSON): User => {
    // TODO: (06/10/21 9:45 am) Uniquely identify users
    // for now client generates ulid if user.key is null, it should be generated server-side
    // As users.json doesn't contain key field, we should check for the presence of the field instead of whether the field is null
    return {
        key: user.key === null ? ulid() : user.key,
        login: user.login,
        password: user.password,
        groups: user.groups

    }
}

type UserJSON = { key: string, login: string, password: string, groups: string[] }

type User = { key: string, login: string, password: string, groups: string[] }

type Group = 'admin' | 'regular';

export { getUsers, putUsers, User }


