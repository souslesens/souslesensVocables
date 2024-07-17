import { z } from "zod";

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

export { PluginsDialogFormProps, PluginOption, PluginOptionType };
