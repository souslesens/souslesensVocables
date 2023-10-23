import {
    Button,
    Checkbox,
    FormControl,
    InputLabel,
    MenuItem,
    Modal,
    Select,
    TextField,
    Box,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    Paper,
    TableContainer,
    TableHead,
    TableRow,
    Stack,
    InputAdornment,
    IconButton,
    OutlinedInput,
} from "@mui/material";

import TableSortLabel from "@mui/material/TableSortLabel";
import { Visibility, VisibilityOff } from "@mui/icons-material";

import { useModel } from "../Admin";
import * as React from "react";
import { SRD } from "srd";
import { identity, style } from "../Utils";
import { newUser, deleteUser, putUsersBis, User } from "../User";
import { ulid } from "ulid";
import { ButtonWithConfirmation } from "./ButtonWithConfirmation";
import Autocomplete from "@mui/material/Autocomplete";
import CsvDownloader from "react-csv-downloader";

const UsersTable = () => {
    const { model, updateModel } = useModel();
    const [filteringChars, setFilteringChars] = React.useState("");
    const [orderBy, setOrderBy] = React.useState<keyof User>("login");
    const [order, setOrder] = React.useState<Order>("asc");
    type Order = "asc" | "desc";
    function handleRequestSort(property: keyof User) {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    }

    const renderUsers = SRD.match(
        {
            notAsked: () => <p>Let&apos;s fetch some data!</p>,
            loading: () => (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <CircularProgress />
                </Box>
            ),
            failure: (msg: string) => (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    ,<p>{`I stumbled into this error when I tried to fetch data: ${msg}. Please, reload this page.`}</p>
                </Box>
            ),
            success: (gotUsers: User[]) => {
                const sortedUsers: User[] = gotUsers.slice().sort((a: User, b: User) => {
                    const left: string = a[orderBy] as string;
                    const right: string = b[orderBy] as string;
                    return order === "asc" ? left.localeCompare(right) : right.localeCompare(left);
                });
                const datas = gotUsers.map((user) => {
                    const { groups, _type, password, ...restOfProperties } = user;
                    const data = {
                        ...restOfProperties,
                        profiles: groups.join(";"),
                    };

                    return data;
                });
                return (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                        <Stack spacing={2}>
                            <CsvDownloader separator="&#9;" filename="users" extension=".tsv" datas={datas} />
                            <Autocomplete
                                disablePortal
                                id="search-users"
                                options={gotUsers.map((user) => user.login)}
                                sx={{ width: 300 }}
                                onInputChange={(event, newInputValue) => {
                                    setFilteringChars(newInputValue);
                                }}
                                renderInput={(params) => <TextField {...params} label="Search Users by login" />}
                            />
                            <Box id="table-container" sx={{ justifyContent: "center", display: "flex", width: "600" }}>
                                <TableContainer sx={{ maxHeight: "400px" }} component={Paper}>
                                    <Table sx={{ width: "100%" }}>
                                        <TableHead>
                                            <TableRow style={{ fontWeight: "bold" }}>
                                                <TableCell style={{ fontWeight: "bold" }}>Source</TableCell>
                                                <TableCell style={{ fontWeight: "bold" }}>
                                                    <TableSortLabel active={orderBy === "login"} direction={order} onClick={() => handleRequestSort("login")}>
                                                        Name
                                                    </TableSortLabel>
                                                </TableCell>
                                                <TableCell style={{ fontWeight: "bold" }}>Profiles</TableCell>
                                                <TableCell style={{ fontWeight: "bold" }}>Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody sx={{ width: "100%", overflow: "visible" }}>
                                            {sortedUsers
                                                .filter((user) => user.login.includes(filteringChars))
                                                .map((user) => {
                                                    return (
                                                        <TableRow key={user.id}>
                                                            <TableCell>{user.source}</TableCell>
                                                            <TableCell>{user.login}</TableCell>
                                                            <TableCell>{user.groups.join(", ")}</TableCell>
                                                            <TableCell>
                                                                <Box sx={{ display: "flex" }}>
                                                                    <UserForm id={`edit-button-${user.id}`} maybeuser={user} />
                                                                    <ButtonWithConfirmation label="Delete" msg={() => deleteUser(user, updateModel)} />{" "}
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                                <UserForm id={`create-button`} create={true} />
                            </Box>
                        </Stack>
                    </Box>
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

type Msg_ = { type: Type.UserClickedModal; payload: boolean } | { type: Type.UserUpdatedField; payload: { fieldname: string; newValue: string } } | { type: Type.ResetUser; payload: Mode };

const updateUser = (userEditionState: UserEditionState, msg: Msg_): UserEditionState => {
    //console.log(Type[msg.type], msg.payload)
    const { model } = useModel();
    const unwrappedUsers = SRD.unwrap([], identity, model.users);
    const getUnmodifiedUsers = unwrappedUsers.reduce((acc, value) => (userEditionState.userForm.id === value.id ? value : acc), newUser(ulid()));
    const resetSourceForm = msg.payload ? userEditionState.userForm : getUnmodifiedUsers;
    const fieldToUpdate: any = msg.type === Type.UserUpdatedField ? msg.payload.fieldname : null;
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
    maybeuser?: User;
    create?: boolean;
    id: string;
};

const UserForm = ({ maybeuser: maybeUser, create = false, id }: UserFormProps) => {
    const user = maybeUser ? maybeUser : newUser(ulid());
    const { model, updateModel } = useModel();
    const unwrappedProfiles = SRD.unwrap([], identity, model.profiles);

    const [userModel, update] = React.useReducer(updateUser, { modal: false, userForm: user });
    const [displayPassword, setDisplayPassword] = React.useState(false);

    const handleClickShowPassword = () => {
        setDisplayPassword(!displayPassword);
    };

    const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    };

    const handleOpen = () => update({ type: Type.UserClickedModal, payload: true });
    const handleClose = () => update({ type: Type.UserClickedModal, payload: false });
    const handleFieldUpdate = (fieldname: string) => (event: React.ChangeEvent<HTMLInputElement>) =>
        update({ type: Type.UserUpdatedField, payload: { fieldname: fieldname, newValue: event.target.value } });

    const saveSources = () => {
        if (create) {
            void putUsersBis(userModel.userForm, Mode.Creation, updateModel, update);
        } else {
            void putUsersBis(userModel.userForm, Mode.Edition, updateModel, update);
        }
    };

    const config = SRD.unwrap({ auth: "json", tools_available: [] }, identity, model.config);
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

                        <FormControl>
                            <InputLabel id="password-label">Password</InputLabel>
                            <OutlinedInput
                                fullWidth
                                onChange={handleFieldUpdate("password")}
                                value={userModel.userForm.password}
                                type={displayPassword ? "text" : "password"}
                                id={`password`}
                                label={"Password"}
                                disabled={user.source != "keycloak" ? false : true}
                                endAdornment={
                                    <InputAdornment position="end">
                                        <IconButton aria-label="toggle password visibility" onClick={handleClickShowPassword} onMouseDown={handleMouseDownPassword} edge="end">
                                            {displayPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                }
                            />
                        </FormControl>
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

                        <Button id="btn-save-user" color="primary" variant="contained" onClick={saveSources}>
                            Save User
                        </Button>
                    </Stack>
                </Box>
            </Modal>
        </>
    );
};

export { UsersTable, Msg_, Type, Mode };
