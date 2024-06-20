import { z } from "zod";

const ToolSchema = z.object({
    type: z.enum(["tool", "plugin"]),
    name: z.string(),
    config: z.unknown(),
});

export type Tool = z.infer<typeof ToolSchema>;

async function getAllTools(): Promise<Tool[]> {
    const response = await fetch("/api/v1/admin/all-tools");
    const json: unknown = await response.json();
    return z
        .object({
            resources: z.array(ToolSchema),
        })
        .parse(json)
        .resources.sort((tool1, tool2) => tool1.name.localeCompare(tool2.name));
}

export { getAllTools };
