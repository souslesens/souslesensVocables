import * as Mui from "@mui/material";
import * as MuiIcons from "@mui/icons-material";
import * as React from "react";

import { RD, SRD, failure, loading, success } from "srd";

import { useModel } from "../Admin";
import { writeLog } from "../Log";
import { PluginsDialogFormProps, PluginOption, PluginOptionType, writeConfig } from "../Plugins";
import { Tool, getAllTools } from "../Tool";

const PluginsDialogForm = (props: PluginsDialogFormProps) => {
    const { onClose, onSubmit, open, plugin } = props;

    const [errors, setErrors] = React.useState("");

    const optionsName = Object.keys(plugin.config);

    const handleValidation = (data) => {
        const parsedForm = PluginOption.safeParse(data);

        if (parsedForm.data !== undefined && optionsName.includes(parsedForm.data.key)) {
            setErrors("This label was already used by another option");
        } else if (parsedForm.error !== undefined) {
            parsedForm.error.issues.forEach((issue) => setErrors(issue.message));
        } else {
            setErrors("");
        }

        return parsedForm;
    };

    return (
        <Mui.Dialog
            fullWidth
            maxWidth="md"
            onClose={onClose}
            open={open}
            PaperProps={{
                component: "form",
                onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
                    event.preventDefault();

                    const formData = new FormData(event.currentTarget);
                    const formJSON = Object.fromEntries((formData as any).entries());

                    const parsedForm = handleValidation(formJSON);
                    if (errors.length === 0) {
                        onSubmit(parsedForm.data);
                    }
                },
            }}
        >
            <Mui.DialogContent>
                <Mui.Stack spacing={2}>
                    <Mui.TextField
                        autofocus
                        defaultValue=""
                        error={errors.length > 0}
                        fullWidth
                        helperText={errors}
                        id="key"
                        label="Label"
                        name="key"
                        onChange={(event: React.FormEvent<HTMLFormElement>) => {
                            handleValidation({ key: event.target.value });
                        }}
                        required
                    />
                    <Mui.TextField defaultValue="" fullWidth id="option" label="Value" name="option" />
                </Mui.Stack>
            </Mui.DialogContent>
            <Mui.DialogActions>
                <Mui.Button color="primary" startIcon={<MuiIcons.Add />} type="submit" variant="contained">
                    {"Add"}
                </Mui.Button>
            </Mui.DialogActions>
        </Mui.Dialog>
    );
};

const PluginsForm = () => {
    const { model, updateModel } = useModel();

    const [allToolsRD, setAllToolsRD] = React.useState<RD<string, Tool[]>>(loading());
    const [openModal, setOpenModal] = React.useState<boolean>(false);
    const [selectedPlugin, setSelectedPlugin] = React.useState<Tool>(undefined);

    const [snackOpen, setSnackOpen] = React.useState<bool>(false);
    const [snackSeverity, setSnackSeverity] = React.useState<string>("success");
    const [snackMessage, setSnackMessage] = React.useState<string>("");

    const me = SRD.withDefault("", model.me);

    React.useEffect(() => {
        getAllTools()
            .then((tools) => setAllToolsRD(success(tools)))
            .catch(() => setAllToolsRD(failure("Couln't load tools")));
    }, []);

    const handleSnackbarClose = async (event: React.SyntheticEvent | Event, reason?: string) => {
        if (reason !== "clickaway") {
            setSnackOpen(false);
        }
    };

    const handleOpenModal = () => {
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
    };

    const handleUpdateOption = async (key: string, value: string) => {
        selectedPlugin.config[key] = value;
        setSelectedPlugin(setSelectedPlugin);
    };

    const handleRemoveOption = (fieldName: string) => () => {
        setSnackOpen(false);
        delete selectedPlugin.config[fieldName];
        setSnackOpen(true);
        setSnackSeverity("success");
        setSnackMessage(`The option “${fieldName}” have been removed`);
    };

    const handleSubmitNewOption = (data: PluginOptionType) => {
        selectedPlugin.config = { ...selectedPlugin.config, [data.key]: data.option };
        handleCloseModal();
    };

    const handleSavePlugins = async () => {
        const plugins = allToolsRD.data.filter((tool: Tool) => tool.type === "plugin");
        const response = await writeConfig(plugins);

        setSnackOpen(false);
        writeLog(me, "ConfigEditor", "save", "plugins");
        setSnackOpen(true);
        if (response.status == 200) {
            setSnackSeverity("warning");
            setSnackMessage("The configuration have been saved. Reloading…");
        } else {
            setSnackSeverity("error");
            setSnackMessage("A problem occurs on the server.");
        }
    };

    return SRD.match(
        {
            success: (tools: Tool[]) => {
                const plugins = tools.filter((tool: Tool) => tool.type === "plugin");

                if (plugins.length == 0) {
                    return (
                        <Mui.Stack direction="column" justifyContent="center">
                            <Mui.Alert variant="filled" severity="info" sx={{ my: 4 }}>
                                {"There is no plugin on this instance"}
                            </Mui.Alert>
                        </Mui.Stack>
                    );
                } else if (selectedPlugin === undefined) {
                    setSelectedPlugin(plugins[0]);
                }

                return (
                    <Mui.Stack>
                        <Mui.Snackbar autoHideDuration={2000} open={snackOpen} onClose={handleSnackbarClose}>
                            <Mui.Alert onClose={handleSnackbarClose} severity={snackSeverity} sx={{ width: "100%" }}>
                                {snackMessage}
                            </Mui.Alert>
                        </Mui.Snackbar>

                        <Mui.Stack direction="row" sx={{ m: 4, height: "400px" }}>
                            <Mui.Box sx={{ width: "100%", maxWidth: 300 }}>
                                <nav>
                                    <Mui.List sx={{ maxHeight: 400, overflow: "auto" }} disablePadding>
                                        {plugins.map((tool) => (
                                            <Mui.ListItemButton selected={tool === selectedPlugin} onClick={() => setSelectedPlugin(tool)}>
                                                <Mui.ListItemIcon>
                                                    <MuiIcons.Extension />
                                                </Mui.ListItemIcon>
                                                <Mui.ListItemText primary={tool.name} />
                                            </Mui.ListItemButton>
                                        ))}
                                    </Mui.List>
                                </nav>
                            </Mui.Box>

                            {selectedPlugin !== undefined && (
                                <Mui.Stack direction="column" spacing={{ xs: 2 }} sx={{ mx: 4, width: "100%" }} useFlexGap>
                                    <Mui.Typography variant="h6">{`Configuration of the plugin “${selectedPlugin.name}”`}</Mui.Typography>
                                    <Mui.Stack spacing={{ xs: 2 }} sx={{ paddingTop: "0.5em", maxHeight: "400px", overflow: "auto" }} useFlexGap>
                                        {Object.entries(selectedPlugin.config).map(([key, value]) => (
                                            <Mui.TextField
                                                defaultValue=""
                                                id={`field-${selectedPlugin.name}-${key}`}
                                                label={key}
                                                onChange={(event) => handleUpdateOption(key, event.target.value)}
                                                value={value}
                                                InputProps={{
                                                    endAdornment: (
                                                        <Mui.InputAdornment position="start">
                                                            <Mui.IconButton color="warning" edge="end" onClick={handleRemoveOption(key)}>
                                                                <MuiIcons.DeleteForever />
                                                            </Mui.IconButton>
                                                        </Mui.InputAdornment>
                                                    ),
                                                }}
                                            />
                                        ))}
                                    </Mui.Stack>
                                    <Mui.Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                        <Mui.Button color="success" onClick={handleOpenModal} startIcon={<MuiIcons.AddCircle />} variant="outlined">
                                            {"Add a new option"}
                                        </Mui.Button>
                                    </Mui.Stack>
                                </Mui.Stack>
                            )}
                        </Mui.Stack>

                        <Mui.Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                            <Mui.Button onClick={handleSavePlugins} type="submit" variant="contained">
                                Save Plugins
                            </Mui.Button>
                        </Mui.Stack>

                        <PluginsDialogForm onClose={handleCloseModal} onSubmit={handleSubmitNewOption} open={openModal} plugin={selectedPlugin} />
                    </Mui.Stack>
                );
            },
            notAsked: () => <p>{"Let’s fetch some data!"}</p>,
            loading: () => (
                <Mui.Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <Mui.CircularProgress />
                </Mui.Box>
            ),
            failure: (msg: string) => (
                <Mui.Alert variant="filled" severity="error" sx={{ m: 4 }}>
                    {`${msg}. Please, reload this page.`}
                </Mui.Alert>
            ),
        },
        allToolsRD,
    );
};

export { PluginsForm };
