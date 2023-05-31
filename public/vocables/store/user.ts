// store/posts.ts
import { createFetcherStore } from "./fetcher";
import type { UserAccount } from "../../../model/UserTypes";

type AuthCheck = { logged: string; user: UserAccount; authSource: string; auth: unknown };

export const $currentUser = createFetcherStore<AuthCheck>(["/api/v1/auth/whoami"]);
