import * as Mui from "@mui/material";
import * as React from "react";
import { z } from "zod";

import { RD, SRD, failure, loading, success } from "srd";

import type { Config } from "../Config";
import { getConfig, updateConfig } from "../Config";
import { useZorm, fieldChain } from "react-zorm";
import { errorMessage } from "./errorMessage";
import { Profile, getProfiles } from "../Profile";
import { Tool, getAllTools } from "../Tool";

const getAvailableThemes = () => {
    return Object.keys(Config.slsvColorThemes).sort((a, b) => a.localeCompare(b));
};

const ConfigFormSchema = z.object({
    defaultGroups: z.array(z.string()),
    tools_available: z.array(z.string()).optional().default([]),
    theme: z.object({
        selector: z.string().optional().transform(Boolean),
        defaultTheme: z.string(),
    }),
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

const ConfigForm = () => {
    const [allProfilesRD, setAllProfilesRD] = React.useState<RD<string, Profile[]>>(loading());
    const [allToolsRD, setAllToolsRD] = React.useState<RD<string, Tool[]>>(loading());
    const [configRD, setConfigRD] = React.useState<RD<string, Config>>(loading());
    const [availableTools, setAvailableTools] = React.useState<string[]>([]);
    const [defaultGroups, setDefaultGroups] = React.useState<string[]>([]);
    const allThemes = React.useMemo(() => getAvailableThemes(), []);

    const loadConfig = React.useCallback(() => {
        getConfig()
            .then((config) => {
                setDefaultGroups(config.defaultGroups);
                setConfigRD(success(config));
                setAvailableTools(config.tools_available);
            })
            .catch(() => setConfigRD(failure("Couldn't load configuration")));
    }, [setConfigRD]);

    React.useEffect(() => {
        getAllTools()
            .then((tools) => setAllToolsRD(success(tools)))
            .catch(() => setAllToolsRD(failure("Couln't load tools")));
        getProfiles()
            .then((profiles) => setAllProfilesRD(success(profiles)))
            .catch(() => setAllProfilesRD(failure("Couln't load profiles")));
        loadConfig();
    }, []);

    const zo = useZorm("general-config", ConfigFormSchema, {
        onValidSubmit(event) {
            event.preventDefault();
            void updateConfig(event.data)
                .catch(() => setConfigRD(failure("Couldn't save configuration")))
                .then(loadConfig);
        },
    });

    const renderRD = SRD.map3(
        (config, allProfiles, allTools) => {
            return (
                <form ref={zo.ref}>
                    <Mui.Stack direction="column" spacing={{ xs: 2 }} sx={{ mx: 12, my: 4 }} useFlexGap>
                        <Mui.Divider>
                            <Mui.Chip label="Groups" size="small" />
                        </Mui.Divider>

                        <Mui.Stack direction="column" spacing={{ xs: 2 }} useFlexGap>
                            <Mui.FormControl>
                                <Mui.InputLabel id={"default-groups-label"}>Default groups</Mui.InputLabel>
                                <Mui.Select<string[]>
                                    id="default-groups"
                                    label="Default groups"
                                    labelId="default-groups-label"
                                    value={defaultGroups}
                                    onChange={(e) => setDefaultGroups(e.target.value as string[])}
                                    multiple
                                >
                                    {allProfiles.map((profile) => (
                                        <Mui.MenuItem key={profile.id} value={profile.id}>
                                            {profile.id}
                                        </Mui.MenuItem>
                                    ))}
                                </Mui.Select>
                                <ZormStringArrayInputs arrayField={zo.fields.defaultGroups} values={defaultGroups} />
                                {errorMessage(zo.errors.defaultGroups)}
                            </Mui.FormControl>
                        </Mui.Stack>

                        <Mui.Divider>
                            <Mui.Chip label="Tools" size="small" />
                        </Mui.Divider>

                        <Mui.Stack direction="column" spacing={{ xs: 2 }} useFlexGap>
                            <Mui.FormControl>
                                <Mui.InputLabel id={"available-tools-label"}>Available tools</Mui.InputLabel>
                                <Mui.Select<string[]>
                                    id={"available-tools"}
                                    labelId={"available-tools-label"}
                                    value={availableTools}
                                    label="Available tools"
                                    onChange={(e) => setAvailableTools(e.target.value as string[])}
                                    renderValue={(values) => values.join(", ")}
                                    multiple
                                >
                                    {allTools.map((tool) => (
                                        <Mui.MenuItem key={tool.name} value={tool.name} disabled={tool.name === "ConfigEditor"}>
                                            {tool.name}&nbsp;<i style={{ opacity: 0.5 }}>({tool.type})</i>
                                        </Mui.MenuItem>
                                    ))}
                                </Mui.Select>
                                <ZormStringArrayInputs arrayField={zo.fields.tools_available} values={availableTools} />
                                {errorMessage(zo.errors.tools_available)}
                            </Mui.FormControl>
                        </Mui.Stack>

                        <Mui.Divider>
                            <Mui.Chip label="Theme" size="small" />
                        </Mui.Divider>

                        <Mui.Stack direction="column" spacing={{ xs: 2 }} useFlexGap>
                            <Mui.Autocomplete
                                disablePortal
                                options={allThemes}
                                defaultValue={config.theme.defaultTheme}
                                renderInput={(params) => <Mui.TextField {...params} name={zo.fields.theme.defaultTheme()} label="Default instance theme" />}
                            />
                            {errorMessage(zo.errors.theme.defaultTheme)}

                            <Mui.FormGroup>
                                <Mui.FormControlLabel
                                    control={<Mui.Checkbox name={zo.fields.theme.selector()} defaultChecked={config.theme.selector} />}
                                    label="Display the theme selector in the navigation bar"
                                />
                            </Mui.FormGroup>
                            {errorMessage(zo.errors.theme.selector)}
                        </Mui.Stack>

                        <Mui.Stack direction="row">
                            <Mui.Button type="submit" variant="contained">
                                Save
                            </Mui.Button>
                        </Mui.Stack>
                    </Mui.Stack>
                </form>
            );
        },
        configRD,
        allProfilesRD,
        allToolsRD
    );

    return SRD.match(
        {
            success: (content) => content,
            notAsked: () => <p>Let’s fetch some data!</p>,
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
        renderRD
    );
};

export { ConfigForm };
