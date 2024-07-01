import { z } from "zod";

const ConfigSchema = z.object({
    auth: z.string(),
    tools_available: z.array(z.string()),
    defaultGroups: z.array(z.string()),
    theme: z.object({
        defaultTheme: z.string(),
        selector: z.boolean(),
    }),
});

export type Config = z.infer<typeof ConfigSchema>;

const UpdateConfigCommandSchema = ConfigSchema.omit({ auth: true });
export type UpdateConfigCommand = z.infer<typeof UpdateConfigCommandSchema>;

async function getConfig(): Promise<Config> {
    const response = await fetch("/api/v1/config");
    const json: unknown = await response.json();
    return ConfigSchema.parse(json);
}

async function updateConfig(dto: UpdateConfigCommand): Promise<Config> {
    await fetch("/api/v1/config", { method: "PUT", body: JSON.stringify(dto), headers: { "Content-Type": "application/json" } });
    return await getConfig();
}

export { getConfig, updateConfig };
