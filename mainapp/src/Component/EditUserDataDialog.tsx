import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, Autocomplete, Checkbox, FormGroup, FormControlLabel, Alert, CircularProgress } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { UserData, UserDataSchema } from "./UserDataDialog";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/themes/prism.css";

interface EditUserDataDialogProps {
    onClose: () => void;
    onSave: () => void;
    open: boolean;
    userDataId: number | null;
}

export const EditUserDataDialog = ({ onClose, onSave, open, userDataId }: EditUserDataDialogProps) => {
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>();
    const [saving, setSaving] = useState(false);

    const [availableSources, setAvailableSources] = useState<string[]>([]);
    const [availableTools, setAvailableTools] = useState<string[]>([]);
    const [availableProfiles, setAvailableProfiles] = useState<string[]>([]);
    const [availableUsers, setAvailableUsers] = useState<string[]>([]);
    const [sourcesLoading, setSourcesLoading] = useState(false);
    const [toolsLoading, setToolsLoading] = useState(false);
    const [profilesLoading, setProfilesLoading] = useState(false);
    const [usersLoading, setUsersLoading] = useState(false);
    const [sourcesError, setSourcesError] = useState<string | null>(null);
    const [toolsError, setToolsError] = useState<string | null>(null);
    const [profilesError, setProfilesError] = useState<string | null>(null);
    const [usersError, setUsersError] = useState<string | null>(null);
    const [sourcesFetched, setSourcesFetched] = useState(false);
    const [toolsFetched, setToolsFetched] = useState(false);
    const [profilesFetched, setProfilesFetched] = useState(false);
    const [usersFetched, setUsersFetched] = useState(false);

    const dataTypes = ["SparqlQuery", "Template", "Other"];

    useEffect(() => {
        if (open) {
            fetchUserData();
            setJsonError(undefined);
        }
    }, [open, userDataId]);

    const fetchUserData = async () => {
        if (userDataId === null) {
            // Creation mode: initialize with empty userData (excluding backend-managed fields)
            const emptyUserData: Partial<UserData> = {
                data_type: "",
                data_label: "",
                data_comment: "",
                data_group: "",
                is_shared: false,
                shared_profiles: [],
                shared_users: [],
                data_tool: "",
                data_source: "",
                readwrite: false,
                data_content: undefined,
            };
            setUserData(emptyUserData as UserData);
            setError(undefined);
            setLoading(false);
            return;
        }

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

    const fetchSources = async () => {
        if (sourcesFetched) return;
        setSourcesLoading(true);
        try {
            const response = await fetch("/api/v1/sources");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const sourcesList = Object.keys(data.resources || {}).sort();
            setAvailableSources(sourcesList);
            setSourcesFetched(true);
            setSourcesError(null);
        } catch (err) {
            setSourcesError("Failed to load sources");
            console.error("Failed to fetch sources:", err);
        }
        setSourcesLoading(false);
    };

    const fetchTools = async () => {
        if (toolsFetched) return;
        setToolsLoading(true);
        try {
            const response = await fetch("/api/v1/tools");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const toolsList = (data.resources || []).map((tool: any) => tool.name).sort();
            setAvailableTools(toolsList);
            setToolsFetched(true);
            setToolsError(null);
        } catch (err) {
            setToolsError("Failed to load tools");
            console.error("Failed to fetch tools:", err);
        }
        setToolsLoading(false);
    };

    const fetchProfiles = async () => {
        if (profilesFetched) return;
        setProfilesLoading(true);
        try {
            const response = await fetch("/api/v1/profiles");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const profilesList = Object.keys(data.resources || {}).sort();
            setAvailableProfiles(profilesList);
            setProfilesFetched(true);
            setProfilesError(null);
        } catch (err) {
            setProfilesError("Failed to load profiles");
            console.error("Failed to fetch profiles:", err);
        }
        setProfilesLoading(false);
    };

    const fetchUsers = async () => {
        if (usersFetched) return;
        setUsersLoading(true);
        try {
            const response = await fetch("/api/v1/users");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const usersList = (data.resources || [])
                .flatMap((item: any) => Object.keys(item))
                .sort();
            setAvailableUsers(usersList);
            setUsersFetched(true);
            setUsersError(null);
        } catch (err) {
            setUsersError("Failed to load users");
            console.error("Failed to fetch users:", err);
        }
        setUsersLoading(false);
    };

    const handleFieldChange = (fieldName: keyof UserData, value: UserData[keyof UserData]) => {
        if (userData) {
            setUserData({ ...userData, [fieldName]: value });
        }
    };

    const [jsonError, setJsonError] = useState<string | undefined>();
    const [jsonValidationState, setJsonValidationState] = useState<{ valid: boolean; error?: string } | null>(null);

    // Debounced JSON validation
    useEffect(() => {
        const timer = setTimeout(() => {
            if (userData?.data_content) {
                const content = typeof userData.data_content === 'string' ? userData.data_content : JSON.stringify(userData.data_content);
                try {
                    JSON.parse(content);
                    setJsonValidationState({ valid: true });
                    // Clear the save-time error if JSON is now valid
                    if (jsonError && jsonError === "Invalid JSON format in Data Content field") {
                        setJsonError(undefined);
                    }
                } catch (err) {
                    setJsonValidationState({ valid: false, error: (err as Error).message });
                }
            } else {
                setJsonValidationState(null);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [userData?.data_content, jsonError]);

    const handleSave = async () => {
        if (!userData) return;

        // Validate JSON for data_content if provided
        let dataContent: any = undefined;
        if (userData.data_content) {
            try {
                dataContent = typeof userData.data_content === 'string' 
                    ? JSON.parse(userData.data_content) 
                    : userData.data_content;
            } catch (err) {
                setJsonError("Invalid JSON format in Data Content field");
                return;
            }
        }

        setSaving(true);
        try {
            const url = userDataId === null 
                ? `/api/v1/users/data`
                : `/api/v1/users/data/${userDataId}`;
            
            const method = userDataId === null ? "POST" : "PUT";

            // Prepare payload: exclude backend-managed fields for creation
            const payload = {
                ...userData,
                data_content: dataContent,
            };

            if (userDataId === null) {
                // Remove backend-managed fields for creation
                const { id, created_at, modification_date, data_path, owned_by, ...createPayload } = payload;
                const response = await fetch(url, {
                    method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(createPayload),
                });

                if (response.status === 200) {
                    setError(undefined);
                    onSave();
                    onClose();
                } else {
                    const errorData = await response.json();
                    setError(errorData.message || "Failed to save user data");
                }
            } else {
                // Update mode: keep all fields except data_path
                const { data_path, ...updatePayload } = payload;
                const response = await fetch(url, {
                    method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatePayload),
                });

                if (response.status === 200) {
                    setError(undefined);
                    onSave();
                    onClose();
                } else {
                    const errorData = await response.json();
                    setError(errorData.message || "Failed to save user data");
                }
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
            <DialogTitle>{userDataId === null ? "Create User Data" : "Edit User Data"}</DialogTitle>
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
                            disabled={loading || !!toolsError}
                            loading={toolsLoading}
                            openOnFocus
                            onOpen={fetchTools}
                            id="data_tool"
                            onChange={(_e, value) => handleFieldChange("data_tool", value)}
                            options={availableTools}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    error={!!validationErrors?.data_tool || !!toolsError}
                                    helperText={toolsError || validationErrors?.data_tool?._errors.join(", ")}
                                    label="Tool"
                                    required
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <>
                                                {toolsLoading ? <CircularProgress color="inherit" size={16} /> : null}
                                                {params.InputProps?.endAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                            value={userData?.data_tool || ""}
                        />

                        <Autocomplete
                            disabled={loading || !!sourcesError}
                            loading={sourcesLoading}
                            openOnFocus
                            onOpen={fetchSources}
                            id="data_source"
                            onChange={(_e, value) => handleFieldChange("data_source", value)}
                            options={availableSources}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    error={!!validationErrors?.data_source || !!sourcesError}
                                    helperText={sourcesError || validationErrors?.data_source?._errors.join(", ")}
                                    label="Source"
                                    required
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <>
                                                {sourcesLoading ? <CircularProgress color="inherit" size={16} /> : null}
                                                {params.InputProps?.endAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
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
                                    disabled={loading || !!profilesError}
                                    loading={profilesLoading}
                                    openOnFocus
                                    onOpen={fetchProfiles}
                                    id="shared_profiles"
                                    multiple
                                    onChange={(_e, value) => handleFieldChange("shared_profiles", value)}
                                    options={availableProfiles}
                                    getOptionLabel={(option) => option}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            error={!!profilesError}
                                            helperText={profilesError}
                                            label="Shared Profiles"
                                            InputProps={{
                                                ...params.InputProps,
                                                endAdornment: (
                                                    <>
                                                        {profilesLoading ? <CircularProgress color="inherit" size={16} /> : null}
                                                        {params.InputProps?.endAdornment}
                                                    </>
                                                ),
                                            }}
                                        />
                                    )}
                                    value={userData?.shared_profiles || []}
                                />

                                <Autocomplete
                                    disabled={loading || !!usersError}
                                    loading={usersLoading}
                                    openOnFocus
                                    onOpen={fetchUsers}
                                    id="shared_users"
                                    multiple
                                    onChange={(_e, value) => handleFieldChange("shared_users", value)}
                                    options={availableUsers}
                                    getOptionLabel={(option) => option}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            error={!!usersError}
                                            helperText={usersError}
                                            label="Shared Users"
                                            InputProps={{
                                                ...params.InputProps,
                                                endAdornment: (
                                                    <>
                                                        {usersLoading ? <CircularProgress color="inherit" size={16} /> : null}
                                                        {params.InputProps?.endAdornment}
                                                    </>
                                                ),
                                            }}
                                        />
                                    )}
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

                    <div>
                        <div
                            style={{
                                border: jsonValidationState?.valid === false || jsonError ? "2px solid #f44336" : "1px solid rgba(0, 0, 0, 0.23)",
                                borderRadius: "4px",
                                overflow: "hidden",
                                transition: "border-color 0.2s",
                            }}
                        >
                            <Editor
                                value={userData?.data_content ? (typeof userData.data_content === 'string' ? userData.data_content : JSON.stringify(userData.data_content, null, 2)) : ""}
                                onValueChange={(code) => handleFieldChange("data_content", code)}
                                highlight={(code) => Prism.highlight(code, Prism.languages.json, "json")}
                                padding={12}
                                style={{
                                    fontFamily: '"Fira code", "Fira Mono", monospace',
                                    fontSize: 13,
                                    minHeight: "140px",
                                    backgroundColor: loading ? "#f5f5f5" : "#fafafa",
                                }}
                                disabled={loading}
                            />
                        </div>
                        {/* Validation indicator */}
                        <div style={{ marginTop: "4px", marginLeft: "12px", fontSize: "0.75rem" }}>
                            {jsonError && (
                                <span style={{ color: "#f44336" }}>
                                    {jsonError}
                                </span>
                            )}
                            {jsonValidationState?.valid === true && !jsonError && (
                                <span style={{ color: "#4caf50" }}>
                                    ✓ Valid JSON
                                </span>
                            )}
                            {jsonValidationState?.valid === false && !jsonError && (
                                <span style={{ color: "#ff9800" }}>
                                    ⚠ {jsonValidationState.error}
                                </span>
                            )}
                        </div>
                    </div>
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
