import * as React from "react";
import { Box, Grid, IconButton, Modal, Typography } from "@mui/material";
import HelpIcon from "@mui/icons-material/Help";
import CloseIcon from "@mui/icons-material/Close";
import { style } from "../Utils";

export function HelpButton({ title, message }: { title: string; message: string }) {
    const [open, setOpen] = React.useState(false);
    const handleOpen = () => {
        setOpen(true);
    };
    const handleClose = () => {
        setOpen(false);
    };

    return (
        <>
            <IconButton aria-label="display help" onClick={handleOpen}>
                <HelpIcon />
            </IconButton>
            <Modal open={open} onClose={handleClose} aria-labelledby="child-modal-title" aria-describedby="child-modal-description">
                <Box sx={{ ...style, width: 600 }}>
                    <Typography id="modal-modal-title" variant="h6" component="h2">
                        <Grid alignItems="center" container spacing={2} wrap="nowrap">
                            <Grid item flex={1}>
                                {title}
                            </Grid>
                            <Grid item>
                                <IconButton onClick={handleClose}>
                                    <CloseIcon />
                                </IconButton>
                            </Grid>
                        </Grid>
                    </Typography>
                    <Typography id="modal-modal-description" sx={{ mt: 2 }}>
                        {message}
                    </Typography>
                </Box>
            </Modal>
        </>
    );
}
