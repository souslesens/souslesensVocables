import * as React from 'react';
import * as ReactDOM from 'react-dom';




async function getUsers(url: string): Promise<User[]> {

    const response = await fetch(url);
    const json = await response.json();
    const users: [string, UserJSON][] = Object.entries(json);
    const mapped_users = users.map(([key, val]) => decodeUser(val))

    return mapped_users
}



const encodeUser = (user: User): UserJSON => {
    return {
        login: user.login,
        password: user.password,
        groups: []

    }
}

const decodeUser = (user: UserJSON): User => {
    return {
        key: user.login,
        login: user.login,
        password: user.password,
        groups: []

    }
}

type UserJSON = { login: string, password: string, groups: Group[] }

type User = { key: string, login: string, password: string, groups: Group[] }

type Group = 'admin' | 'regular';

export { getUsers, User }
