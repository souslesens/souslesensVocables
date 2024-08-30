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

type PluginOptionType = z.infer<typeof PluginOptionSchema>;

const RepositorySchema = z
    .object({
        plugins: z.string().array(),
        token: z.string(),
        url: z.string().url(),
        version: z.string().trim(),
    })
    .partial();

type RepositoryType = z.infer<typeof RepositorySchema>;

async function deleteRepository(repositoryId) {
    try {
        const response = await fetch(`${endpoint}/repositories/repository/${repositoryId}`, {
            method: "delete",
        });
        return response.json();
    } catch (error) {
        return { status: 500, message: error };
    }
}

async function fetchRepository(repositoryId) {
    try {
        const response = await fetch(`${endpoint}/repositories/fetch/${repositoryId}`);
        return response.json();
    } catch (error) {
        return { status: 500, message: error };
    }
}

async function getEnabledPlugins() {
    try {
        const response = await fetch(endpoint);
        return response.json();
    } catch (error) {
        return { status: 500, message: error };
    }
}

async function getRepositoryPlugins(repositoryId) {
    try {
        const response = await fetch(`${endpoint}/repositories/plugins/${repositoryId}`);
        return response.json();
    } catch (error) {
        return { status: 500, message: error };
    }
}

async function getRepositoryTags(repositoryId) {
    try {
        const response = await fetch(`${endpoint}/repositories/tags/${repositoryId}`);
        return response.json();
    } catch (error) {
        return { status: 500, message: error };
    }
}

async function readConfig() {
    try {
        const response = await fetch(`${endpoint}/config`);
        return response.json();
    } catch (error) {
        return { status: 500, message: error };
    }
}

async function readRepositories() {
    try {
        const response = await fetch(`${endpoint}/repositories`);
        return response.json();
    } catch (error) {
        return { status: 500, message: error };
    }
}

async function writeConfig(plugins) {
    try {
        const body = { plugins: plugins };

        const response = await fetch(`${endpoint}/config`, {
            method: "put",
            body: JSON.stringify(body, null, "\t"),
            headers: { "Content-Type": "application/json" },
        });
        const { message, resources } = (await response.json()) as Response;

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
        const { message, resources } = (await response.json()) as Response;

        return response;
    } catch (error) {
        return { status: 500, message: error };
    }
}

export {
    PluginOptionSchema,
    PluginOptionType,
    RepositorySchema,
    RepositoryType,
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
