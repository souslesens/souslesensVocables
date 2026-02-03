import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    AlertProps,
    Autocomplete,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    FormControl,
    FormControlLabel,
    FormGroup,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    Stack,
    TextField,
} from "@mui/material";
import { z } from "zod";

import { RD, SRD, failure, loading, success } from "srd";

import { ConfigType, getConfig, updateConfig } from "../Config";
import { useZorm, fieldChain } from "react-zorm";
import { errorMessage } from "./errorMessage";
import { Profile, getProfiles } from "../Profile";
import { Tool, getAllTools } from "../Tool";

const getAvailableThemes = () => {
    return Object.keys(window.Config.slsvColorThemes).sort((a, b) => a.localeCompare(b));
};

const ConfigFormSchema = z.object({
    defaultGroups: z.array(z.string()),
    tools_available: z.array(z.string()).optional().default([]),
    theme: z.object({
        selector: z.string().optional().transform(Boolean),
        defaultTheme: z.string(),
    }),
    sparqlDownloadLimit: z.number().positive(),
});

type FieldChain = (index: number) => ReturnType<typeof fieldChain<z.ZodArray<z.ZodString>>>[number];

function ZormStringArrayInputs({ arrayField, values }: { arrayField: FieldChain; values: Array<string> }) {
    return (
        <>
            {values.map((t, idx) => (
                <input key={t} type="hidden" name={arrayField(idx)("name")} value={t} />
            ))}
        </>
    );
}

interface Notification {
    message: string;
    severity?: AlertProps["severity"];
}

function useNotifier(): { notify: (state: Notification) => void; element: JSX.Element } {
    const [notification, setNotification] = useState<Notification | null>(null);

    const element = (
        <Snackbar autoHideDuration={2000} open={notification !== null} onClose={() => setNotification(null)}>
            {notification !== null ? (
                <Alert onClose={() => setNotification(null)} severity={notification.severity} sx={{ width: "100%" }}>
                    {notification.message}
                </Alert>
            ) : undefined}
        </Snackbar>
    );
    return {
        element,
        notify(newNotification) {
            setNotification(newNotification);
        },
    };
}

const ConfigForm = () => {
    const [allProfilesRD, setAllProfilesRD] = useState<RD<string, Profile[]>>(loading());
    const [allToolsRD, setAllToolsRD] = useState<RD<string, Tool[]>>(loading());
    const [configRD, setConfigRD] = useState<RD<string, ConfigType>>(loading());
    const [availableTools, setAvailableTools] = useState<string[]>([]);
    const [defaultGroups, setDefaultGroups] = useState<string[]>([]);
    const allThemes = useMemo(() => getAvailableThemes(), []);

    const notifier = useNotifier();

    const loadConfig = useCallback(() => {
        getConfig()
            .then((config) => {
                setDefaultGroups(config.defaultGroups);
                setConfigRD(success(config));
                setAvailableTools(config.tools_available);
            })
            .catch(() => setConfigRD(failure("Couldn't load configuration")));
    }, [setConfigRD]);

    useEffect(() => {
        getAllTools()
            .then((tools) => setAllToolsRD(success(tools)))
            .catch(() => setAllToolsRD(failure("Couln't load tools")));
        getProfiles()
            .then((profiles) => setAllProfilesRD(success(profiles)))
            .catch(() => setAllProfilesRD(failure("Couln't load profiles")));
        loadConfig();
    }, [loadConfig]);

    const zo = useZorm("general-config", ConfigFormSchema, {
        onValidSubmit(event) {
            event.preventDefault();
            void updateConfig(event.data)
                .then(() => notifier.notify({ message: "Settings correctly saved", severity: "success" }))
                .catch(() => setConfigRD(failure("Couldn't save configuration")))
                .then(loadConfig);
        },
    });

    const renderRD = SRD.map3(
        (config, allProfiles, allTools) => {
            return (
                <form ref={zo.ref}>
                    {notifier.element}
                    <Stack direction="column" spacing={{ xs: 2 }} sx={{ m: 4 }} useFlexGap>
                        <Stack direction="column" spacing={{ xs: 2 }} useFlexGap>
                            <FormControl>
                                <InputLabel id={"default-groups-label"}>Default groups</InputLabel>
                                <Select<string[]>
                                    id="default-groups"
                                    label="Default groups"
                                    labelId="default-groups-label"
                                    value={defaultGroups}
                                    onChange={(e) => setDefaultGroups(e.target.value as string[])}
                                    renderValue={(v) => v.join(", ")}
                                    multiple
                                >
                                    {allProfiles.map((profile) => (
                                        <MenuItem key={profile.id} value={profile.id}>
                                            <Checkbox checked={defaultGroups.includes(profile.id)} />
                                            {profile.id}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <ZormStringArrayInputs arrayField={zo.fields.defaultGroups} values={defaultGroups} />
                                {errorMessage(zo.errors.defaultGroups)}
                            </FormControl>
                        </Stack>

                        <Stack direction="column" spacing={{ xs: 2 }} useFlexGap>
                            <FormControl>
                                <InputLabel id={"available-tools-label"}>Available tools</InputLabel>
                                <Select<string[]>
                                    id={"available-tools"}
                                    labelId={"available-tools-label"}
                                    value={availableTools}
                                    label="Available tools"
                                    onChange={(e) => setAvailableTools(e.target.value as string[])}
                                    renderValue={(values) => values.join(", ")}
                                    multiple
                                >
                                    {allTools.map((tool) => (
                                        <MenuItem key={tool.name} value={tool.name} disabled={tool.name === "ConfigEditor"}>
                                            <Checkbox checked={availableTools.includes(tool.name)} />
                                            {tool.name}&nbsp;<i style={{ opacity: 0.5 }}>({tool.type})</i>
                                        </MenuItem>
                                    ))}
                                </Select>
                                <ZormStringArrayInputs arrayField={zo.fields.tools_available} values={availableTools} />
                                {errorMessage(zo.errors.tools_available)}
                            </FormControl>
                        </Stack>

                        <Stack direction="column" spacing={{ xs: 2 }} useFlexGap>
                            <Autocomplete
                                disablePortal
                                options={allThemes}
                                defaultValue={config.theme.defaultTheme}
                                renderInput={(params) => <TextField {...params} name={zo.fields.theme.defaultTheme()} label="Default instance theme" />}
                            />
                            {errorMessage(zo.errors.theme.defaultTheme)}

                            <FormGroup>
                                <FormControlLabel
                                    control={<Checkbox name={zo.fields.theme.selector()} defaultChecked={config.theme.selector} />}
                                    label="Display the theme selector in the navigation bar"
                                />
                            </FormGroup>
                            {errorMessage(zo.errors.theme.selector)}
                        </Stack>

                        <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                            <Button type="submit" variant="contained">
                                Save Settings
                            </Button>
                        </Stack>
                    </Stack>
                </form>
            );
        },
        configRD,
        allProfilesRD,
        allToolsRD,
    );

    return SRD.match(
        {
            success: (content) => content,
            notAsked: () => <p>Let’s fetch some data!</p>,
            loading: () => (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <CircularProgress />
                </Box>
            ),
            failure: (msg: string) => (
                <Alert variant="filled" severity="error" sx={{ m: 4 }}>
                    {`${msg}. Please, reload this page.`}
                </Alert>
            ),
        },
        renderRD,
    );
};

export { ConfigForm };
