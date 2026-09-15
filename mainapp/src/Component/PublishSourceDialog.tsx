import { useEffect, useState } from "react";
import { Alert, Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, TextField } from "@mui/material";
import { LoadingButton } from "@mui/lab";

import { ServerSource } from "../Source";

type PublishSourceDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onPublishSuccess: (sources: ServerSource[]) => void;
    sourceName: string;
};

export const PublishSourceDialog = ({ isOpen, onClose, onPublishSuccess, sourceName }: PublishSourceDialogProps) => {
    const [error, setError] = useState<string | undefined>();
    const [groups, setGroups] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !sourceName) {
            return;
        }
        async function fetchPublishableGroups() {
            setError(undefined);
            setSelectedGroup(null);
            setGroups([]);
            setLoading(true);
            try {
                const response = await fetch(`/api/v1/sources/${encodeURIComponent(sourceName)}/publish`);
                const data = (await response.json()) as { resources: string[]; message: string };
                if (response.status == 200) {
                    setGroups(data.resources);
                } else {
                    setError(data.message);
                }
            } catch (error) {
                setError(`An error occurs while loading the groups: ${error as string}`);
            }
            setLoading(false);
        }
        void fetchPublishableGroups();
    }, [isOpen, sourceName]);

    const handlePublish = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/sources/${encodeURIComponent(sourceName)}/publish`, {
                body: JSON.stringify({ group: selectedGroup }),
                headers: { "Content-Type": "application/json" },
                method: "put",
            });
            const data = (await response.json()) as { resources: Record<string, ServerSource>; message: string };
            if (response.status == 200) {
                onPublishSuccess(Object.values(data.resources));
                onClose();
            } else {
                setError(`An error occurs during publication: ${data.message}`);
            }
        } catch (error) {
            setError(`An error occurs during publication: ${error as string}`);
        }
        setLoading(false);
    };

    const hasNoGroup = !loading && !error && groups.length === 0;

    return (
        <Dialog aria-labelledby="publish-dialog-title" fullWidth maxWidth="sm" open={isOpen} onClose={onClose}>
            <DialogTitle id="publish-dialog-title">{`Publish ${sourceName}`}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }} useFlexGap>
                    <DialogContentText>The source becomes visible to every profile with access to the chosen group.</DialogContentText>
                    <Autocomplete
                        disabled={loading || groups.length === 0}
                        id="publish-group"
                        onChange={(_event, group) => setSelectedGroup(group)}
                        options={groups}
                        renderInput={(params) => <TextField {...params} label="Group" />}
                        value={selectedGroup}
                    />
                    {hasNoGroup ? <Alert severity="info">No group where you have readwrite rights for this source.</Alert> : null}
                    {error ? <Alert severity="error">{error}</Alert> : null}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button disabled={loading} onClick={onClose}>
                    Cancel
                </Button>
                <LoadingButton color="primary" disabled={!selectedGroup} loading={loading} onClick={handlePublish}>
                    Publish
                </LoadingButton>
            </DialogActions>
        </Dialog>
    );
};
