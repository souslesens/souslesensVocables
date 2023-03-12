type UserAccount = { id: string; _type: string; login: string; groups: string[]; source: string };
type UserAccountWithPassword = { id: string; _type: string; password?: string; login: string; groups: string[]; source: string };
type SqlConfig = { host: string; port: number; user: string; password: string; database: string; table: string; loginColumn: string; passwordColumn: string; groupsColumn: string };
export { UserAccount, UserAccountWithPassword, SqlConfig };
