import * as React from "react";
import { Button } from "@material-ui/core";

const ButtonWithConfirmation = (props: { msg: () => void; label: string; disabled?: boolean }) => {
    const [hasBeenClicked, userClickedButton] = React.useState(false);

    return !hasBeenClicked ? (
        <Button disabled={props.disabled} color="secondary" onClick={() => userClickedButton(true)}>
            {props.label}
        </Button>
    ) : (
        <Button color="secondary" onClick={props.msg}>
            Confirm?
        </Button>
    );
};

export { ButtonWithConfirmation };
