import { useState } from "react";
import { Button, Box, CircularProgress } from "@mui/material";
import { red } from "@mui/material/colors";

type ButtonWithConfirmationProps = {
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    func: ((...args: any) => Promise<void>) | ((...args: any) => void);
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    args: any[];
    label: string;
    disabled?: boolean;
};

const ButtonWithConfirmation = ({ func, args, label, disabled }: ButtonWithConfirmationProps) => {
    const [btnState, setBtnState] = useState<"initial" | "confirm" | "loading" | "done" | "error">("initial");

    const handleConfirm = async () => {
        setBtnState("loading");
        try {
            /* eslint-disable @typescript-eslint/no-unsafe-argument */
            await func(...args);
            setBtnState("done");
        } catch (error) {
            console.error(error);
            setBtnState("error");
        }
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
            <>
                <Box sx={{ position: "relative" }}>
                    <Button disabled={true} variant="contained" color="error">
                        Loading
                    </Button>
                    <CircularProgress
                        size={24}
                        sx={{
                            color: red[500],
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            marginTop: "-12px",
                            marginLeft: "-12px",
                        }}
                    />
                </Box>
            </>
        );
    }

    if (btnState === "confirm") {
        return (
            <Button variant="contained" color="error" onClick={handleConfirm}>
                Confirm?
            </Button>
        );
    }
    if (btnState === "done" || btnState === "error") {
        return (
            <Button
                variant="outlined"
                color="error"
                onClick={() => {
                    setBtnState("initial");
                }}
            >
                {btnState === "done" ? "Done" : "Error"}
            </Button>
        );
    }
};

export { ButtonWithConfirmation };
