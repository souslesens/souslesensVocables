import { useState, ChangeEvent, Dispatch, useEffect } from "react";
import {
    Box,
    CircularProgress,
    Alert,
    Stack,
    TextField,
    TableContainer,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableSortLabel,
    TableBody,
    Chip,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    FormControlLabel,
    SelectChangeEvent,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";

import CsvDownloader from "react-csv-downloader";
import { SRD } from "srd";
import { ulid } from "ulid";

import { Msg, useModel } from "../Admin";
import { cleanUpText, identity } from "../Utils";
import { newUser, deleteUser, putUsersBis, User } from "../User";
import { ButtonWithConfirmation } from "./ButtonWithConfirmation";
import { PasswordField } from "./PasswordField";
import { writeLog } from "../Log";

export const UsersTable = () => {
    const { model, updateModel } = useModel();
    const [filteringChars, setFilteringChars] = useState("");
    const [orderBy, setOrderBy] = useState<keyof User>("login");
    const [order, setOrder] = useState<Order>("asc");
    type Order = "asc" | "desc";

    const me = SRD.withDefault("", model.me);

    function handleRequestSort(property: keyof User) {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    }

    const handleDeleteUser = (user: User, updateModel: Dispatch<Msg>) => {
        void deleteUser(user, updateModel);
        void writeLog(me, "ConfigEditor", "delete", user.login);
    };

    const [userDialogState, setUserDialogState] = useState<{ open: boolean; user?: User }>({ open: false });

    const config = SRD.unwrap(
        {
            auth: "database",
            tools_available: [],
            defaultGroups: [],
            theme: {
                defaultTheme: "",
                selector: false,
            },
        },
        identity,
        model.config,
    );

    const canCreateUsers = config.auth != "keycloak";

    const renderUsers = SRD.match(
        {
            notAsked: () => <p>Let&apos;s fetch some data!</p>,
            loading: () => (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <CircularProgress />
                </Box>
            ),
            failure: (msg: string) => (
                <Alert variant="filled" severity="error" sx={{ m: 4 }}>
                    {`I stumbled into this error when I tried to fetch data: ${msg}. Please, reload this page.`}
                </Alert>
            ),
            success: (gotUsers: User[]) => {
                const sortedUsers: User[] = gotUsers.slice().sort((a: User, b: User) => {
                    let left = "";
                    let right = "";

                    if (a[orderBy] instanceof Array) {
                        left = a[orderBy].toString();
                        right = b[orderBy].toString();
                    } else {
                        left = a[orderBy] as string;
                        right = b[orderBy] as string;
                    }

                    return order === "asc" ? left.localeCompare(right) : right.localeCompare(left);
                });
                const csvData = gotUsers.map((user) => {
                    const { groups, _type, password, ...restOfProperties } = user;
                    const data = {
                        ...restOfProperties,
                        maxNumberCreatedSource: restOfProperties.maxNumberCreatedSource.toString(),
                        allowSourceCreation: restOfProperties.allowSourceCreation ? "1" : "0",
                        profiles: groups.join(";"),
                    };

                    return data;
                });
                return (
                    <Stack direction="column" spacing={{ xs: 2 }} sx={{ m: 4 }} useFlexGap>
                        <TextField
                            inputProps={{ autocomplete: "off" }}
                            label="Search Users by login"
                            id="search-users"
                            onChange={(event) => {
                                setFilteringChars(event.target.value);
                            }}
                        />
                        <TableContainer sx={{ height: "400px" }} component={Paper}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow style={{ fontWeight: "bold" }}>
                                        <TableCell align="center" style={{ fontWeight: "bold" }}>
                                            <TableSortLabel active={orderBy === "source"} direction={order} onClick={() => handleRequestSort("source")}>
                                                Source
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell style={{ fontWeight: "bold", width: "100%" }}>
                                            <TableSortLabel active={orderBy === "login"} direction={order} onClick={() => handleRequestSort("login")}>
                                                Name
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell align="center" style={{ fontWeight: "bold" }}>
                                            <TableSortLabel active={orderBy === "groups"} direction={order} onClick={() => handleRequestSort("groups")}>
                                                Profiles
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell align="center" style={{ fontWeight: "bold" }}>
                                            Actions
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody sx={{ width: "100%", overflow: "visible" }}>
                                    {sortedUsers
                                        .filter((user) => cleanUpText(user.login).includes(cleanUpText(filteringChars)))
                                        .map((user) => {
                                            return (
                                                <TableRow key={user.id}>
                                                    <TableCell align="center">{user.source}</TableCell>
                                                    <TableCell>{user.login}</TableCell>
                                                    <TableCell>
                                                        <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                            {user.groups.map((group) => (
                                                                <Chip key={group} label={group} size="small" />
                                                            ))}
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                            <Button color="primary" variant="contained" onClick={() => setUserDialogState({ open: true, user: user })}>
                                                                Edit
                                                            </Button>
                                                            <ButtonWithConfirmation label="Delete" msg={() => handleDeleteUser(user, updateModel)} />
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                            <CsvDownloader separator="&#9;" filename="users" extension=".tsv" datas={csvData}>
                                <Button variant="outlined">Download CSV</Button>
                            </CsvDownloader>
                            {canCreateUsers ? (
                                <Button color="primary" variant="contained" onClick={() => setUserDialogState({ open: true })}>
                                    Create User
                                </Button>
                            ) : null}
                        </Stack>
                        <UserFormDialog open={userDialogState.open} maybeuser={userDialogState.user} me={me} onClose={() => setUserDialogState((prev) => ({ ...prev, open: false }))} />
                    </Stack>
                );
            },
        },
        model.users,
    );

    return renderUsers;
};

type UserFormDialogProps = {
    open: boolean;
    me: string;
    maybeuser?: User;
    onClose: () => void;
};

const UserFormDialog = ({ open, maybeuser: maybeUser, me = "", onClose }: UserFormDialogProps) => {
    const create = maybeUser === undefined;
    const { model, updateModel } = useModel();
    const unwrappedProfiles = SRD.unwrap([], identity, model.profiles);
    const [userForm, setUserForm] = useState<User>(maybeUser ? maybeUser : newUser(ulid()));

    useEffect(() => {
        if (open) {
            setUserForm(maybeUser ? maybeUser : newUser(ulid()));
        }
    }, [open, maybeUser]);

    const handleFieldUpdate = (fieldname: string) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string | string[]>) => {
        let value: string | string[] | boolean | number = event.target.value;
        if (fieldname === "allowSourceCreation") {
            value = event.target.value === "true" ? false : true;
        }
        if (fieldname === "maxNumberCreatedSource" && !Array.isArray(event.target.value)) {
            value = parseInt(event.target.value);
            if (value < 0 || isNaN(value)) {
                value = 0;
            }
        }
        setUserForm((prev) => ({
            ...prev,
            [fieldname]: value,
        }));
    };
    const saveUser = async () => {
        try {
            await putUsersBis(userForm, create, updateModel);
        } catch (e) {
            console.error(e);
        }
        const mode = create ? "create" : "edit";
        void writeLog(me, "ConfigEditor", mode, userForm.login);
        onClose();
    };

    return (
        <Dialog
            onClose={onClose}
            open={open}
            PaperProps={{
                component: "form",
                onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    void saveUser();
                },
            }}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>{create ? "Create new user" : `Edit user '${userForm.login}'`}</DialogTitle>
            <DialogContent>
                <Stack
                    spacing={2}
                    // Prevents textfield label from being cut
                    sx={{ paddingTop: 1 }}
                >
                    <TextField variant="outlined" fullWidth onChange={handleFieldUpdate("login")} value={userForm.login} id={`login`} label={"Login"} disabled={create ? false : true} required />
                    {userForm.source === "database" && <PasswordField id={`password`} label={"New Password"} onChange={handleFieldUpdate("password")} value={userForm.password} required />}
                    <FormControl>
                        <InputLabel id="select-groups-label">Profiles</InputLabel>
                        <Select
                            labelId="select-profiles-label"
                            id="select-groups"
                            multiple
                            value={userForm.groups}
                            label="select-profile-label"
                            fullWidth
                            renderValue={(selected: string | string[]) => (typeof selected === "string" ? selected : selected.join(", "))}
                            onChange={handleFieldUpdate("groups")}
                        >
                            {unwrappedProfiles.map((profile) => (
                                <MenuItem key={profile.name} value={profile.name}>
                                    <Checkbox checked={userForm.groups.indexOf(profile.name) > -1} />
                                    {profile.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl>
                        <FormControlLabel
                            control={<Checkbox value={userForm.allowSourceCreation} checked={userForm.allowSourceCreation} onChange={handleFieldUpdate("allowSourceCreation")} />}
                            label="Allow the user to create sources"
                        />
                    </FormControl>
                    <TextField
                        id="max-allowed-sources"
                        type="number"
                        label="Limit the number of source the user can create"
                        value={userForm.maxNumberCreatedSource || 0}
                        disabled={!userForm.allowSourceCreation}
                        onChange={handleFieldUpdate("maxNumberCreatedSource")}
                        InputLabelProps={{
                            shrink: true,
                        }}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button type="submit" color="primary" variant="contained">
                    Save User
                </Button>
            </DialogActions>
        </Dialog>
    );
};
