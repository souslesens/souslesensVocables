import * as Mui from "@mui/material";
import * as React from "react";

import { SRD } from "srd";

import { useModel } from "../Admin";


const getAvailableThemes = () => {
    return Object.keys(Config.slsvColorThemes).sort((a, b) => a.localeCompare(b));
};

const ConfigForm = () => {
    const { model, updateModel } = useModel();

    const me = SRD.withDefault("", model.me);

    const render = SRD.match(
        {
            notAsked: () => (
                <p>Let’s fetch some data!</p>
            ),
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
            success: () => (
                <Mui.Stack direction="column" spacing={{ xs: 2 }} sx={{ mx: 12, my: 4 }} useFlexGap>
                    <Mui.Divider><Mui.Chip label="Tools" size="small" /></Mui.Divider>
                    <Mui.Stack direction="column" spacing={{ xs: 2 }} useFlexGap>
                        <Mui.TextField
                            label="Available instance tools"
                            select
                        >
                            <hr />
                        </Mui.TextField>
                    </Mui.Stack>
                    <Mui.Divider><Mui.Chip label="Theme" size="small" /></Mui.Divider>
                    <Mui.Stack direction="column" spacing={{ xs: 2 }} useFlexGap>
                        <Mui.Autocomplete
                            disablePortal
                            options={getAvailableThemes()}
                            renderInput={(params) => <Mui.TextField {...params} label="Default instance theme" />}
                        />
                        <Mui.FormGroup>
                            <Mui.FormControlLabel control={<Mui.Checkbox defaultChecked />} label="Display the theme selector in the navigation bar" />
                        </Mui.FormGroup>
                    </Mui.Stack>
                </Mui.Stack>
            ),
        },
        model.me
    );

    return render;
}

export { ConfigForm };
