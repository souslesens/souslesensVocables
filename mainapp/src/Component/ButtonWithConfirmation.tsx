import { useState } from "react";
import { Button, Box, CircularProgress, ButtonGroup, SxProps, Theme } from "@mui/material";
import { red } from "@mui/material/colors";

type ButtonWithConfirmationProps = {
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    func: ((...args: any) => Promise<void>) | ((...args: any) => void);
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    args: any[];
    label: string;
    disabled?: boolean;
    size?: "small" | "medium" | "large";
    buttonSx?: SxProps<Theme>;
};

const ButtonWithConfirmation = ({ func, args, label, disabled, size = "medium", buttonSx }: ButtonWithConfirmationProps) => {
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
            <Button disabled={disabled} size={size} sx={buttonSx} variant="outlined" color="error" onClick={() => setBtnState("confirm")}>
                {label}
            </Button>
        );
    }

    if (btnState === "loading") {
        return (
            <>
                <Box sx={{ position: "relative" }}>
                    <Button disabled={true} size={size} sx={buttonSx} variant="contained" color="error">
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
            <ButtonGroup size={size} variant="contained" aria-label="Basic button group" color="error">
                <Button sx={buttonSx} variant="contained" color="error" onClick={handleConfirm}>
                    Ok
                </Button>
                <Button
                    sx={buttonSx}
                    variant="outlined"
                    color="error"
                    onClick={() => {
                        setBtnState("initial");
                    }}
                >
                    No
                </Button>
            </ButtonGroup>
        );
    }
    if (btnState === "done" || btnState === "error") {
        return (
            <Button
                size={size}
                sx={buttonSx}
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
