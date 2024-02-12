import * as React from "react";
import { Button } from "@mui/material";

const ButtonWithConfirmation = (props: { msg: () => void; label: string; disabled?: boolean }) => {
    const [hasBeenClicked, userClickedButton] = React.useState(false);

    return !hasBeenClicked ? (
        <Button disabled={props.disabled} variant="outlined" color="error" onClick={() => userClickedButton(true)}>
            {props.label}
        </Button>
    ) : (
        <Button variant="contained" color="error" onClick={props.msg}>
            Confirm?
        </Button>
    );
};

export { ButtonWithConfirmation };
