import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, Autocomplete, Checkbox, FormGroup, FormControlLabel, Alert } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { UserData, UserDataSchema } from "./UserDataDialog";

interface EditUserDataDialogProps {
    onClose: () => void;
    onSave: () => void;
    open: boolean;
    userDataId: number;
}

export const EditUserDataDialog = ({ onClose, onSave, open, userDataId }: EditUserDataDialogProps) => {
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>();
    const [saving, setSaving] = useState(false);

    const dataTypes = ["SparqlQuery", "Template", "Other"];
    const dataTools = ["Lineage", "KGquery", "SPARQL", "MappingModeler", "UserSettings", "Browse", "Weaver"];

    useEffect(() => {
        if (open && userDataId) {
            fetchUserData();
        }
    }, [open, userDataId]);

    const fetchUserData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/users/data/${userDataId}`);
            if (response.status === 200) {
                const data = await response.json();
                setUserData(data);
                setError(undefined);
            } else {
                setError("Failed to load user data");
            }
        } catch (err) {
            console.error(err);
            setError("An error occurred while loading user data");
        }
        setLoading(false);
    };

    const handleFieldChange = (fieldName: keyof UserData, value: UserData[keyof UserData]) => {
        if (userData) {
            setUserData({ ...userData, [fieldName]: value });
        }
    };

    const handleSave = async () => {
        if (!userData) return;

        setSaving(true);
        try {
            const response = await fetch(`/api/v1/users/data/${userDataId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(userData),
            });

            if (response.status === 200) {
                setError(undefined);
                onSave();
                onClose();
            } else {
                const errorData = await response.json();
                setError(errorData.message || "Failed to save user data");
            }
        } catch (err) {
            console.error(err);
            setError("An error occurred while saving user data");
        }
        setSaving(false);
    };

    const validationErrors = userData ? UserDataSchema.safeParse(userData).error?.format() : null;

    return (
        <Dialog fullWidth maxWidth="md" open={open} onClose={onClose}>
            <DialogTitle>Edit User Data</DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ pt: 1 }}>
                    {error && <Alert severity="error">{error}</Alert>}

                    <Stack spacing={2}>
                        <TextField
                            disabled={loading}
                            error={!!validationErrors?.data_label}
                            helperText={validationErrors?.data_label?._errors.join(", ")}
                            fullWidth
                            label="Label"
                            onChange={(e) => handleFieldChange("data_label", e.target.value)}
                            required
                            value={userData?.data_label || ""}
                        />

                        <Autocomplete
                            disabled={loading}
                            freeSolo
                            id="data_type"
                            onChange={(_e, value) => handleFieldChange("data_type", value)}
                            options={dataTypes}
                            renderInput={(params) => <TextField {...params} error={!!validationErrors?.data_type} helperText={validationErrors?.data_type?._errors.join(", ")} label="Type" required />}
                            value={userData?.data_type || ""}
                        />

                        <Autocomplete
                            disabled={loading}
                            freeSolo
                            id="data_tool"
                            onChange={(_e, value) => handleFieldChange("data_tool", value)}
                            options={dataTools}
                            renderInput={(params) => <TextField {...params} error={!!validationErrors?.data_tool} helperText={validationErrors?.data_tool?._errors.join(", ")} label="Tool" required />}
                            value={userData?.data_tool || ""}
                        />

                        <TextField
                            disabled={loading}
                            error={!!validationErrors?.data_source}
                            helperText={validationErrors?.data_source?._errors.join(", ")}
                            fullWidth
                            label="Source"
                            onChange={(e) => handleFieldChange("data_source", e.target.value)}
                            required
                            value={userData?.data_source || ""}
                        />

                        <TextField
                            disabled={loading}
                            error={!!validationErrors?.data_group}
                            fullWidth
                            helperText={validationErrors?.data_group?._errors.join(", ")}
                            label="Group"
                            onChange={(e) => handleFieldChange("data_group", e.target.value)}
                            value={userData?.data_group || ""}
                        />

                        <TextField
                            disabled={loading}
                            error={!!validationErrors?.data_comment}
                            fullWidth
                            helperText={validationErrors?.data_comment?._errors.join(", ")}
                            label="Comment"
                            multiline
                            onChange={(e) => handleFieldChange("data_comment", e.target.value)}
                            rows={3}
                            value={userData?.data_comment || ""}
                        />
                    </Stack>

                    <Stack spacing={2}>
                        <FormGroup>
                            <FormControlLabel
                                control={<Checkbox checked={userData?.is_shared || false} disabled={loading} onChange={(e) => handleFieldChange("is_shared", e.target.checked)} />}
                                label="Shared with others"
                            />
                        </FormGroup>

                        {userData?.is_shared && (
                            <>
                                <Autocomplete
                                    disabled={loading}
                                    freeSolo
                                    id="shared_profiles"
                                    multiple
                                    onChange={(_e, value) => handleFieldChange("shared_profiles", value)}
                                    options={[]}
                                    renderInput={(params) => <TextField {...params} label="Shared Profiles" />}
                                    value={userData?.shared_profiles || []}
                                />

                                <Autocomplete
                                    disabled={loading}
                                    freeSolo
                                    id="shared_users"
                                    multiple
                                    onChange={(_e, value) => handleFieldChange("shared_users", value)}
                                    options={[]}
                                    renderInput={(params) => <TextField {...params} label="Shared Users" />}
                                    value={userData?.shared_users || []}
                                />
                            </>
                        )}

                        <FormGroup>
                            <FormControlLabel
                                control={<Checkbox checked={userData?.readwrite || false} disabled={loading} onChange={(e) => handleFieldChange("readwrite", e.target.checked)} />}
                                label="Readwrite enabled"
                            />
                        </FormGroup>
                    </Stack>

                    <TextField
                        disabled={loading}
                        error={!!validationErrors?.data_content}
                        fullWidth
                        helperText={validationErrors?.data_content?._errors.join(", ")}
                        label="Data Content (JSON)"
                        multiline
                        minRows={5}
                        onChange={(e) => handleFieldChange("data_content", e.target.value === "" ? undefined : JSON.parse(e.target.value))}
                        value={userData?.data_content ? JSON.stringify(userData.data_content, null, 2) : ""}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button disabled={loading || saving} onClick={onClose}>
                    Cancel
                </Button>
                <LoadingButton loading={saving} color="primary" onClick={handleSave} variant="contained">
                    Save
                </LoadingButton>
            </DialogActions>
        </Dialog>
    );
};
