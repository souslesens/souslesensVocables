type UserAccount = { id: string; _type: string; login: string; groups: string[]; source: string };
type UserAccountWithPassword = { id: string; _type: string; password?: string; login: string; groups: string[]; source: string };
export { UserAccount, UserAccountWithPassword };
