import { z } from "zod";

const ConfigSchema = z.object({
    auth: z.string(),
    tools_available: z.array(z.string()),
    defaultGroups: z.array(z.string()),
    theme: z.object({
        defaultTheme: z.string(),
        selector: z.boolean(),
    }),
    sparqlDownloadLimit: z.number().positive(),
});

export type ConfigType = z.infer<typeof ConfigSchema>;

const _UpdateConfigCommandSchema = ConfigSchema.omit({ auth: true });
export type UpdateConfigCommand = z.infer<typeof _UpdateConfigCommandSchema>;

async function getConfig(): Promise<ConfigType> {
    const response = await fetch("/api/v1/config");
    const json: unknown = await response.json();
    return ConfigSchema.parse(json);
}

async function updateConfig(dto: UpdateConfigCommand): Promise<ConfigType> {
    await fetch("/api/v1/config", { method: "PUT", body: JSON.stringify(dto), headers: { "Content-Type": "application/json" } });
    return await getConfig();
}

export { getConfig, updateConfig };
