
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
        groups: [],
        key: user.key

    }
}

const decodeUser = (user: UserJSON): User => {
    return {
        key: user.key === null ? ulid() : user.key,
        login: user.login,
        password: user.password,
        groups: []

    }
}

type UserJSON = { key: string, login: string, password: string, groups: string[] }

type User = { key: string, login: string, password: string, groups: string[] }

type Group = 'admin' | 'regular';

export { getUsers, putUsers, User }


