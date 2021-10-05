declare function getUsers(url: string): Promise<User[]>;
declare function putUsers(url: string, body: User[]): Promise<User[]>;
declare type User = {
    key: string;
    login: string;
    password: string;
    groups: string[];
};
export { getUsers, putUsers, User };
