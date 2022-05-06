type UserAccount = { id: string; _type: string; login: string; groups: string[]; source: string };
type UserAccounts = Record<string, UserAccount>;

export { UserAccount, UserAccounts };
