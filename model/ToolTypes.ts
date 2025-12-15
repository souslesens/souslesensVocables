export interface Tool {
    type: "tool" | "plugin";
    name: string;
    config?: unknown;
    publicTool: boolean;
}
