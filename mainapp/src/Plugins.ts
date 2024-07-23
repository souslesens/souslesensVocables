import { z } from "zod";

import { Tool } from "Tool";

const endpoint = "/api/v1/admin/plugins";

const PluginOption = z
    .object({
        key: z
            .string()
            .trim()
            .regex(new RegExp(/^[a-zA-Z][a-zA-Z0-9]*$/), "The label must starts with a letter, use only alphanumerical characters and do not contains any space")
            .min(1, { message: "The option label cannot be empty" }),
        option: z.string().min(0),
    })
    .partial();

type PluginsDialogFormProps = {
    onClose: (e: Event) => void;
    onSubmit: (e: Event) => void;
    open: boolean;
    plugin: Tool;
};

type PluginOptionType = z.infer<typeof PluginOption>;

async function writeConfig(plugins: Tool[]) {
    try {
        const body = { plugins: plugins };

        const response = await fetch(endpoint, {
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

export { PluginsDialogFormProps, PluginOption, PluginOptionType, writeConfig };
