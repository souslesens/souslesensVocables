import { useState } from "react";
import { Button } from "@mui/material";

type ButtonWithConfirmationProps = {
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    func: ((...args: any) => Promise<void>) | ((...args: any) => void);
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    args: any[];
    label: string;
    disabled?: boolean;
};

const ButtonWithConfirmation = ({ func, args, label, disabled }: ButtonWithConfirmationProps) => {
    const [btnState, setBtnState] = useState<"initial" | "confirm" | "loading" | "done">("initial");

    const handleConfirm = async () => {
        setBtnState("loading");
        /* eslint-disable @typescript-eslint/no-unsafe-argument */
        await func(...args);
        setBtnState("done");
    };

    if (btnState === "initial") {
        return (
            <Button disabled={disabled} variant="outlined" color="error" onClick={() => setBtnState("confirm")}>
                {label}
            </Button>
        );
    }

    if (btnState === "loading") {
        return (
            <Button disabled={true} variant="contained" color="error">
                …
            </Button>
        );
    }

    if (btnState === "confirm") {
        return (
            <Button variant="contained" color="error" onClick={handleConfirm}>
                Confirm?
            </Button>
        );
    }
    if (btnState === "done") {
        return (
            <Button
                variant="outlined"
                color="error"
                onClick={() => {
                    setBtnState("initial");
                }}
            >
                Done
            </Button>
        );
    }
};

export { ButtonWithConfirmation };
