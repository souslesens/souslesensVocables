import { useState, useReducer, ChangeEvent, Dispatch } from "react";
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
    Modal,
    FormControl,
    InputLabel,
    OutlinedInput,
    Select,
    MenuItem,
    Checkbox,
    FormControlLabel,
    SelectChangeEvent,
} from "@mui/material";

import CsvDownloader from "react-csv-downloader";
import { SRD } from "srd";
import { ulid } from "ulid";

import { Msg, useModel } from "../Admin";
import { cleanUpText, identity, style } from "../Utils";
import { newUser, deleteUser, putUsersBis, User } from "../User";
import { ButtonWithConfirmation } from "./ButtonWithConfirmation";
import { PasswordField } from "./PasswordField";
import { writeLog } from "../Log";

const UsersTable = () => {
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
                                                            <UserForm id={`edit-button-${user.id}`} maybeuser={user} me={me} />
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
                            <UserForm id={`create-button`} create={true} me={me} />
                        </Stack>
                    </Stack>
                );
            },
        },
        model.users
    );

    return renderUsers;
};

type UserEditionState = { modal: boolean; userForm: User };

const enum Type {
    UserClickedModal,
    UserUpdatedField,
    ResetUser,
}
const enum Mode {
    Creation,
    Edition,
}

export type Msg_ =
    | { type: Type.UserClickedModal; payload: boolean }
    | { type: Type.UserUpdatedField; payload: { fieldname: string; newValue: string | string[] | boolean | number } }
    | { type: Type.ResetUser; payload: Mode };

const updateUser = (userEditionState: UserEditionState, msg: Msg_): UserEditionState => {
    //console.log(Type[msg.type], msg.payload)
    const { model } = useModel();
    const unwrappedUsers = SRD.unwrap([], identity, model.users);
    const getUnmodifiedUsers = unwrappedUsers.reduce((acc, value) => (userEditionState.userForm.id === value.id ? value : acc), newUser(ulid()));
    const resetSourceForm = msg.payload ? userEditionState.userForm : getUnmodifiedUsers;
    const fieldToUpdate = msg.type === Type.UserUpdatedField ? msg.payload.fieldname : "";
    switch (msg.type) {
        case Type.UserClickedModal:
            return { ...userEditionState, modal: msg.payload };

        case Type.UserUpdatedField:
            return { ...userEditionState, userForm: { ...userEditionState.userForm, [fieldToUpdate]: msg.payload.newValue } };

        case Type.ResetUser:
            switch (msg.payload) {
                case Mode.Creation:
                    return { ...userEditionState, userForm: newUser(ulid()) };
                case Mode.Edition:
                    return { ...userEditionState, userForm: msg.payload ? userEditionState.userForm : resetSourceForm };
            }
    }
};

type UserFormProps = {
    me: string;
    maybeuser?: User;
    create?: boolean;
    id: string;
};

const UserForm = ({ maybeuser: maybeUser, create = false, id, me = "" }: UserFormProps) => {
    const user = maybeUser ? maybeUser : newUser(ulid());
    const { model, updateModel } = useModel();
    const unwrappedProfiles = SRD.unwrap([], identity, model.profiles);

    const [userModel, update] = useReducer(updateUser, { modal: false, userForm: user });

    const handleOpen = () => update({ type: Type.UserClickedModal, payload: true });
    const handleClose = () => update({ type: Type.UserClickedModal, payload: false });
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
        update({ type: Type.UserUpdatedField, payload: { fieldname: fieldname, newValue: value } });
    };
    const saveUser = () => {
        void putUsersBis(userModel.userForm, create ? Mode.Creation : Mode.Edition, updateModel, update);
        const mode = create ? "create" : "edit";
        void writeLog(me, "ConfigEditor", mode, userModel.userForm.login);
    };

    const config = SRD.unwrap(
        {
            auth: "json",
            tools_available: [],
            defaultGroups: [],
            theme: {
                defaultTheme: "",
                selector: false,
            },
        },
        identity,
        model.config
    );
    const createEditButton = (
        <Button id={id} color="primary" variant="contained" onClick={handleOpen}>
            {create ? "Create User" : "Edit"}
        </Button>
    );

    return (
        <>
            {create ? (config.auth != "keycloak" ? createEditButton : null) : createEditButton}
            <Modal onClose={handleClose} open={userModel.modal}>
                <Box sx={style}>
                    <Stack spacing={4}>
                        <h2>{`Edit ${user.login}`}</h2>
                        <FormControl>
                            <InputLabel id="login-label">Login</InputLabel>
                            <OutlinedInput fullWidth onChange={handleFieldUpdate("login")} value={userModel.userForm.login} id={`login`} label={"Login"} disabled={create ? false : true} />
                        </FormControl>

                        <PasswordField
                            disabled={user.source != "keycloak" ? false : true}
                            id={`password`}
                            label={"Password"}
                            onChange={handleFieldUpdate("password")}
                            value={userModel.userForm.password}
                        />

                        <FormControl>
                            <InputLabel id="select-groups-label">Profiles</InputLabel>
                            <Select
                                labelId="select-profiles-label"
                                id="select-groups"
                                multiple
                                value={userModel.userForm.groups}
                                label="select-profile-label"
                                fullWidth
                                renderValue={(selected: string | string[]) => (typeof selected === "string" ? selected : selected.join(", "))}
                                onChange={handleFieldUpdate("groups")}
                            >
                                {unwrappedProfiles.map((profile) => (
                                    <MenuItem key={profile.name} value={profile.name}>
                                        <Checkbox checked={userModel.userForm.groups.indexOf(profile.name) > -1} />
                                        {profile.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl>
                            <FormControlLabel
                                control={
                                    <Checkbox value={userModel.userForm.allowSourceCreation} checked={userModel.userForm.allowSourceCreation} onChange={handleFieldUpdate("allowSourceCreation")} />
                                }
                                label="Allow the user to create sources"
                            />
                        </FormControl>

                        <FormControl>
                            <TextField
                                id="max-allowed-sources"
                                type="number"
                                label="Limit the number of source the user can create"
                                value={userModel.userForm.maxNumberCreatedSource || 0}
                                disabled={!userModel.userForm.allowSourceCreation}
                                onChange={handleFieldUpdate("maxNumberCreatedSource")}
                                InputLabelProps={{
                                    shrink: true,
                                }}
                            />
                        </FormControl>

                        <Button id="btn-save-user" color="primary" variant="contained" onClick={saveUser}>
                            Save User
                        </Button>
                    </Stack>
                </Box>
            </Modal>
        </>
    );
};

export { UsersTable, Type, Mode };
