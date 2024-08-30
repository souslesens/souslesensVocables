import { Button } from "@mui/material";
import { useState } from "react";

const ButtonWithConfirmation = (props: { msg: () => void; label: string; disabled?: boolean }) => {
    const [hasBeenClicked, userClickedButton] = useState(false);

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
