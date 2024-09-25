import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

type DeleteDialogProps = {
    description: string;
    isOpen: boolean;
    onClose: () => void;
    onDelete: () => void;
    title: string;
};

export const DeleteDialog = ({ description, isOpen, onClose, onDelete, title }: DeleteDialogProps) => {
    return (
        <Dialog aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description" open={isOpen} onClose={onClose}>
            <DialogTitle id="delete-dialog-title">{title}</DialogTitle>
            <DialogContent>
                <DialogContentText id="delete-dialog-description">{description}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button autoFocus onClick={onClose}>
                    Cancel
                </Button>
                <Button color="error" onClick={onDelete}>
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    );
};
