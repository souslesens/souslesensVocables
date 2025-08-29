import { useState, ChangeEvent, Dispatch, useEffect, useRef } from "react";
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
    IconButton,
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
    FormHelperText,
} from "@mui/material";
import { Edit } from "@mui/icons-material";
import CsvDownloader from "react-csv-downloader";
import { SRD } from "srd";
import { ulid } from "ulid";

import { Msg, useModel } from "../Admin";
import { cleanUpText, identity } from "../Utils";
import { newUser, deleteUser, putUsersBis, User } from "../User";
import { ButtonWithConfirmation } from "./ButtonWithConfirmation";
import { PasswordField } from "./PasswordField";
import { writeLog } from "../Log";
import { z } from "zod";

export const UsersTable = () => {
    const { model, updateModel } = useModel();
    const [filteringChars, setFilteringChars] = useState("");
    const [orderBy, setOrderBy] = useState<keyof User>("login");
    const [order, setOrder] = useState<Order>("asc");
    const searchInputRef = useRef<HTMLInputElement | null>(null);
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

    const handleAddFilter = (event: ChangeEvent<HTMLInputElement>) => {
        const content = filteringChars ? `${filteringChars} ` : "";
        setFilteringChars(`${content}${event.target.value}:`);
        setTimeout(() => {
            searchInputRef?.current?.focus();
        }, 100);
    };

    const filterSearchBar = (user: User, searchEntry: string) => {
        // extract group:xxx from searchEntry
        const profiles: string[] = [];
        const strElems: string[] = [];
        const splitedInput = searchEntry.split(/[ ]+/);
        splitedInput.forEach((input) => {
            if (input.startsWith("profile:")) {
                profiles.push(...input.replace("profile:", "").split(","));
            } else {
                strElems.push(input);
            }
        });
        const filteredSourcesByProfiles = user.groups // XXX: user.group is profiles here
            .map((profile) => {
                return cleanUpText(profile).includes(cleanUpText(profiles.join(" ")));
            })
            .reduce((acc, val) => acc || val, false); // return true if at least one true

        const filteredSourcesByText = cleanUpText(user.login).includes(cleanUpText(strElems.join(" ")));

        return filteredSourcesByText && filteredSourcesByProfiles;
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
                const goToProfile = (e: React.MouseEvent, profile: string) => {
                    e.preventDefault();
                    updateModel({ type: "currentEditionTab", payload: { tab: "profiles", initialFilter: profile } });
                };

                return (
                    <Stack direction="column" spacing={{ xs: 2 }} sx={{ m: 4 }} useFlexGap>
                        <Stack direction="row">
                            <TextField sx={{ width: "100px" }} select id="filter-users" label="Filters" value="" onChange={handleAddFilter}>
                                <MenuItem value="profile">profile:</MenuItem>
                            </TextField>
                            <TextField
                                sx={{ flex: 1 }}
                                inputRef={searchInputRef}
                                value={filteringChars}
                                inputProps={{ autoComplete: "off" }}
                                label="Search Users by login"
                                id="search-users"
                                onChange={(event) => {
                                    setFilteringChars(event.target.value);
                                }}
                            />
                        </Stack>
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
                                        .filter((user) => {
                                            return filterSearchBar(user, filteringChars);
                                        })
                                        .map((user) => {
                                            return (
                                                <TableRow key={user.id}>
                                                    <TableCell align="center">{user.source}</TableCell>
                                                    <TableCell>{user.login}</TableCell>
                                                    <TableCell>
                                                        <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                            {user.groups.map((group) => (
                                                                <a href="" key={group} onClick={(e) => goToProfile(e, group)}>
                                                                    <Chip key={group} label={group} size="small" />
                                                                </a>
                                                            ))}
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                            <IconButton aria-label="edit" color="primary" onClick={() => setUserDialogState({ open: true, user: user })} size="small" title="Edit">
                                                                <Edit />
                                                            </IconButton>
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

const UserFormSchema = z.object({
    login: z.string().nonempty(),
    password: z.string().nonempty(),
    groups: z.array(z.string()),
    allowSourceCreation: z.boolean(),
    maxNumberCreatedSource: z.number(),
});

const UserFormEditShema = UserFormSchema.extend({
    password: z.string().optional(),
});

const UserFormDialog = ({ open, maybeuser: maybeUser, me = "", onClose }: UserFormDialogProps) => {
    const create = maybeUser === undefined;
    const { model, updateModel } = useModel();
    const unwrappedProfiles = SRD.unwrap([], identity, model.profiles);
    const [userForm, setUserForm] = useState<User>(maybeUser ? maybeUser : newUser(ulid()));

    useEffect(() => {
        if (open) {
            setUserForm(maybeUser ? maybeUser : newUser(ulid()));
            setErrors(undefined);
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
    const saveUser = async (data: User) => {
        try {
            await putUsersBis(data, create, updateModel);
        } catch (e) {
            console.error(e);
        }
        const mode = create ? "create" : "edit";
        void writeLog(me, "ConfigEditor", mode, data.login);
        onClose();
    };

    const [errors, setErrors] = useState<Record<string, string> | undefined>();

    return (
        <Dialog
            onClose={onClose}
            open={open}
            PaperProps={{
                component: "form",
                onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    const validation = (create ? UserFormSchema : UserFormEditShema).safeParse(userForm);
                    if (validation.success) {
                        void saveUser(userForm);
                        setErrors(undefined);
                    } else {
                        const currentErrors: Record<string, string> = {};
                        validation.error.issues.forEach((issue) => {
                            issue.path.forEach((path) => {
                                currentErrors[path] = issue.message;
                            });
                        });
                        setErrors(currentErrors);
                    }
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
                    <TextField
                        variant="outlined"
                        fullWidth
                        onChange={handleFieldUpdate("login")}
                        value={userForm.login}
                        id={`login`}
                        label={"Login"}
                        disabled={create ? false : true}
                        error={errors?.login !== undefined}
                        helperText={errors?.login}
                        InputLabelProps={{
                            // Leave the validation to zod
                            required: true,
                        }}
                    />
                    {userForm.source === "database" && (
                        <PasswordField
                            id={`password`}
                            label={create ? "Password" : "New Password"}
                            onChange={handleFieldUpdate("password")}
                            value={userForm.password}
                            error={errors?.password !== undefined}
                            helperText={errors?.password}
                            InputLabelProps={{
                                // Leave the validation to zod
                                required: true,
                            }}
                        />
                    )}
                    <FormControl error={errors?.groups !== undefined}>
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
                        <FormHelperText>{errors?.groups}</FormHelperText>
                    </FormControl>
                    <FormControl>
                        <FormControlLabel
                            control={<Checkbox value={userForm.allowSourceCreation} checked={userForm.allowSourceCreation} onChange={handleFieldUpdate("allowSourceCreation")} />}
                            label="Allow the user to create sources"
                        />
                        <FormHelperText>{errors?.allowSourceCreation}</FormHelperText>
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
                        error={errors?.maxNumberCreatedSource !== undefined}
                        helperText={errors?.maxNumberCreatedSource}
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
