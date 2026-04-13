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
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import { z } from "zod";

import { RD, SRD, failure, loading, success } from "srd";

import { ConfigType, getConfig, updateConfig } from "../Config";
import { useZorm, fieldChain } from "react-zorm";
import { errorMessage } from "./errorMessage";
import { HelpTooltip } from "./HelpModal";
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

type RouteInfo = {
    route: string;
    methods: string[];
    quotas: string[];
};

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
    const [routesInfo, setRoutesInfo] = useState<RouteInfo[]>([]);
    const [generalQuota, setGeneralQuota] = useState<Array<{ route: string; method: string; limit: string }>>([{ route: "", method: "", limit: "" }]);
    const allThemes = useMemo(() => getAvailableThemes(), []);

    const notifier = useNotifier();

    const loadConfig = useCallback(() => {
        getConfig()
            .then((config) => {
                setDefaultGroups(config.defaultGroups);
                setConfigRD(success(config));
                setAvailableTools(config.tools_available);
                const generalQuotaEntries: Array<{ route: string; method: string; limit: string }> = [];
                if (config.generalQuota && Object.keys(config.generalQuota).length > 0) {
                    Object.entries(config.generalQuota).forEach(([route, methods]) => {
                        Object.entries(methods).forEach(([method, limit]) => {
                            generalQuotaEntries.push({ route, method, limit: String(limit) });
                        });
                    });
                }
                setGeneralQuota(generalQuotaEntries.length > 0 ? generalQuotaEntries : [{ route: "", method: "", limit: "" }]);
            })
            .catch((err) => {
                console.error("Error loading config:", err);
                setConfigRD(failure("Couldn't load configuration"));
            });
    }, [setConfigRD, setGeneralQuota]);

    useEffect(() => {
        getAllTools()
            .then((tools) => setAllToolsRD(success(tools)))
            .catch(() => setAllToolsRD(failure("Couln't load tools")));
        getProfiles()
            .then((profiles) => setAllProfilesRD(success(profiles)))
            .catch(() => setAllProfilesRD(failure("Couln't load profiles")));
        loadConfig();
    }, [loadConfig]);

    useEffect(() => {
        fetch("/api/v1/routesinfo")
            .then((res) => res.json())
            .then((data: RouteInfo[]) => setRoutesInfo(data))
            .catch((err) => console.error("Error loading routes info:", err));
    }, []);

    const zo = useZorm("general-config", ConfigFormSchema, { setupListeners: false });

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        const formData = new FormData(event.target as HTMLFormElement);
        const themeSelectorCheckbox = (event.target as HTMLFormElement).querySelector(`input[name="${zo.fields.theme.selector()}"]`) as HTMLInputElement;

        const generalQuotaObj: Record<string, Record<string, number>> = {};
        generalQuota.forEach((q) => {
            if (q.route && q.method && q.limit) {
                if (!generalQuotaObj[q.route]) {
                    generalQuotaObj[q.route] = {};
                }
                generalQuotaObj[q.route][q.method] = Number(q.limit) || 0;
            }
        });

        const configData = {
            defaultGroups,
            tools_available: availableTools,
            theme: {
                defaultTheme: formData.get(zo.fields.theme.defaultTheme()) as string,
                selector: themeSelectorCheckbox?.checked ?? false,
            },
            sparqlDownloadLimit: 10000,
            generalQuota: generalQuotaObj,
        };

        void updateConfig(configData)
            .then(() => notifier.notify({ message: "Settings correctly saved", severity: "success" }))
            .catch(() => setConfigRD(failure("Couldn't save configuration")))
            .then(loadConfig);
    };

    const renderRD = SRD.map3(
        (config, allProfiles, allTools) => {
            return (
                <form ref={zo.ref} onSubmit={handleSubmit}>
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

                        <Stack direction="column" spacing={{ xs: 2 }} useFlexGap>
                            <FormControl sx={{ mt: 2 }}>
                                <Box>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Typography variant="subtitle1" gutterBottom>
                                            API Rate Limits
                                        </Typography>
                                        <HelpTooltip title="Set the maximum number of requests allowed per minute for each API route. This applies globally to all users." />
                                    </Box>
                                    {routesInfo.length === 0 ? (
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            Loading available routes...
                                        </Typography>
                                    ) : routesInfo.filter((r) => r.quotas.length > 0).length === 0 ? (
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            No routes with quota restrictions available
                                        </Typography>
                                    ) : null}
                                    {generalQuota.map((q, idx) => {
                                        const selectedRouteInfo = routesInfo.find((r) => r.route === q.route);
                                        const methodsAvailable = selectedRouteInfo?.methods || [];
                                        const allMethodsForRoute = routesInfo.find((r) => r.route === q.route)?.methods || [];
                                        const currentMethodIsAvailable = q.method && (!allMethodsForRoute.length || allMethodsForRoute.includes(q.method));

                                        return (
                                            <Grid container spacing={1} alignItems="center" key={idx} sx={{ mb: 1 }}>
                                                <Grid item xs={4}>
                                                    <Select
                                                        fullWidth
                                                        value={q.route}
                                                        onChange={(e) => {
                                                            const newQuota = [...generalQuota];
                                                            newQuota[idx].route = e.target.value;
                                                            const newRouteInfo = routesInfo.find((r) => r.route === e.target.value);
                                                            newQuota[idx].method = newRouteInfo?.methods[0] || "";
                                                            setGeneralQuota(newQuota);
                                                        }}
                                                    >
                                                        {routesInfo
                                                            .filter((routeInfo) => routeInfo.quotas.length > 0)
                                                            .map((routeInfo) => (
                                                                <MenuItem key={routeInfo.route} value={routeInfo.route}>
                                                                    {routeInfo.route}
                                                                </MenuItem>
                                                            ))}
                                                        {q.route && !routesInfo.some((r) => r.route === q.route) && (
                                                            <MenuItem key={q.route} value={q.route}>
                                                                {q.route}
                                                            </MenuItem>
                                                        )}
                                                    </Select>
                                                </Grid>
                                                <Grid item xs={3}>
                                                    <Select
                                                        fullWidth
                                                        value={q.method || ""}
                                                        disabled={!q.route}
                                                        onChange={(e) => {
                                                            const newQuota = [...generalQuota];
                                                            newQuota[idx].method = e.target.value;
                                                            setGeneralQuota(newQuota);
                                                        }}
                                                    >
                                                        {methodsAvailable.map((method) => (
                                                            <MenuItem key={method} value={method}>
                                                                {method}
                                                            </MenuItem>
                                                        ))}
                                                        {currentMethodIsAvailable && q.method && !methodsAvailable.includes(q.method) && (
                                                            <MenuItem key={q.method} value={q.method}>
                                                                {q.method}
                                                            </MenuItem>
                                                        )}
                                                    </Select>
                                                </Grid>
                                                <Grid item xs={4}>
                                                    <TextField
                                                        fullWidth
                                                        type="number"
                                                        label="Limit"
                                                        value={q.limit}
                                                        onChange={(e) => {
                                                            const newQuota = [...generalQuota];
                                                            newQuota[idx].limit = e.target.value;
                                                            setGeneralQuota(newQuota);
                                                        }}
                                                        InputProps={{ inputProps: { min: 0 } }}
                                                    />
                                                </Grid>
                                                <Grid item xs={1}>
                                                    <IconButton
                                                        aria-label="delete quota entry"
                                                        onClick={() => {
                                                            const newQuota = generalQuota.filter((_v, i) => i !== idx);
                                                            setGeneralQuota(newQuota.length ? newQuota : [{ route: "", method: "", limit: "" }]);
                                                        }}
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Grid>
                                            </Grid>
                                        );
                                    })}
                                    <Button variant="outlined" onClick={() => setGeneralQuota([...generalQuota, { route: "", method: "", limit: "" }])}>
                                        Add quota
                                    </Button>
                                </Box>
                            </FormControl>
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
            notAsked: () => <p>Let's fetch some data!</p>,
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
