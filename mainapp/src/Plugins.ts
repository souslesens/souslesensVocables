import { z } from "zod";

const endpoint = "/api/v1/admin/plugins";

const PluginOptionSchema = z
    .object({
        key: z
            .string()
            .trim()
            .regex(new RegExp(/^[a-zA-Z][a-zA-Z0-9]*$/), "The label must starts with a letter, use only alphanumerical characters and do not contains any space")
            .min(1, { message: "The option label cannot be empty" }),
        option: z.string().min(0),
    })
    .partial();

export type PluginOptionType = z.infer<typeof PluginOptionSchema>;

const RepositorySchema = z
    .object({
        plugins: z.string().array(),
        token: z.string(),
        url: z.string().url(),
        version: z.string().trim(),
    })
    .partial();

export type RepositoryType = z.infer<typeof RepositorySchema>;

export type Response<T = unknown> =
    | {
          status: number;
          message: T;
      }
    | {
          status: 500;
          message: unknown;
      }
    | {
          status: string;
          message: string;
      };

async function deleteRepository(repositoryId: string) {
    try {
        const response = await fetch(`${endpoint}/repositories/repository/${repositoryId}`, {
            method: "delete",
        });
        return response;
    } catch (error) {
        return { status: 500, message: error };
    }
}

async function fetchRepository(repositoryId: string) {
    try {
        const response = await fetch(`${endpoint}/repositories/fetch/${repositoryId}`);
        return response.json() as Promise<Response>;
    } catch (error) {
        return { status: 500, message: error };
    }
}

async function getEnabledPlugins(): Promise<Array<{ name: string }>> {
    const response = await fetch(endpoint);
    return response.json() as Promise<Array<{ name: string }>>;
}

async function getRepositoryPlugins(repositoryId: string): Promise<Response<string[]>> {
    const response = await fetch(`${endpoint}/repositories/plugins/${repositoryId}`);
    return response.json() as Promise<Response<string[]>>;
}

async function getRepositoryTags(repositoryId: string): Promise<Response<string[]>> {
    const response = await fetch(`${endpoint}/repositories/tags/${repositoryId}`);
    return response.json() as Promise<Response<string[]>>;
}

async function readConfig(): Promise<Record<string, PluginOptionType>> {
    const response = await fetch(`${endpoint}/config`);
    return response.json() as Promise<Record<string, PluginOptionType>>;
}

async function readRepositories(): Promise<Record<string, RepositoryType>> {
    const response = await fetch(`${endpoint}/repositories`);
    return response.json() as Promise<Record<string, RepositoryType>>;
}

async function writeConfig(pluginsConfig: Record<string, PluginOptionType>) {
    try {
        const body = { plugins: pluginsConfig };

        const response = await fetch(`${endpoint}/config`, {
            method: "put",
            body: JSON.stringify(body, null, "\t"),
            headers: { "Content-Type": "application/json" },
        });
        return response;
    } catch (error) {
        return { status: 500, message: error };
    }
}

async function writeRepository(identifier: string, data: object, toFetch: boolean) {
    try {
        const body = { data: data, toFetch: toFetch };

        const response = await fetch(`${endpoint}/repositories/repository/${identifier}`, {
            method: "put",
            body: JSON.stringify(body, null, "\t"),
            headers: { "Content-Type": "application/json" },
        });

        if (response.status >= 500) {
            const responseData = (await response.json()) as Response;
            return { status: responseData.status, message: responseData.message };
        }

        return response;
    } catch (error) {
        return { status: 500, message: error };
    }
}

export {
    PluginOptionSchema,
    RepositorySchema,
    deleteRepository,
    fetchRepository,
    getEnabledPlugins,
    getRepositoryPlugins,
    getRepositoryTags,
    readConfig,
    readRepositories,
    writeConfig,
    writeRepository,
};
