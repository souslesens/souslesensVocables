declare function getUsers(url: string): Promise<User[]>;
declare type User = {
    key: string;
    login: string;
    password: string;
    groups: Group[];
};
declare type Group = 'admin' | 'regular';
export { getUsers, User };
