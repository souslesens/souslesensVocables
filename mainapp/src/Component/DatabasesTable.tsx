/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    Grid,
    IconButton,
    InputAdornment,
    MenuItem,
    Modal,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import TableSortLabel from "@mui/material/TableSortLabel";
import { Done, Visibility, VisibilityOff } from "@mui/icons-material";

import * as React from "react";
import { SRD } from "srd";
import { ulid } from "ulid";
import { zod } from "zod";
import { useZorm } from "react-zorm";
import { ZodCustomIssueWithMessage } from "react-zorm/dist/types";
import * as z from "zod";

import { useModel } from "../Admin";
import { ButtonWithConfirmation } from "./ButtonWithConfirmation";
<<<<<<< HEAD
=======
import { PasswordField } from "./PasswordField";
>>>>>>> 571e7551 (feat(mainapp): add the PasswordField component to the configEditor)
import {
    addDatabase,
    Database,
    DatabaseSchema,
    defaultDatabase,
    deleteDatabase,
    editDatabase,
    SourceAccessControl,
} from "../Database";
import { style } from "../Utils";

const enum Type {
    ResetDatabase,
    ServerRespondedWithDatabases,
    UserUpdatedField,
}

const enum Mode {
    Creation,
    Edition,
}

type DatabaseEditionState = {
    form: Database;
};

type DatabaseFormProps = {
    database?: Database;
    create?: boolean;
};

type Msg_ =
    | { type: Type.UserUpdatedField; payload: { fieldname: string; newValue: string } }


const updateDatabase = (databaseEditionState: DatabaseEditionState, msg: Msg_): DatabaseEditionState => {
    switch (msg.type) {
        case Type.ResetDatabase:
            return { form: msg.payload };
        case Type.ServerRespondedWithDatabases:
        case Type.UserUpdatedField:
            return {
                form: {
                    ...databaseEditionState.form,
                    [msg.payload.id]: msg.payload.value,
                }
            };
    }
}

const validateForm = (form: DatabaseFormProps) => {
    const validation = DatabaseSchema.safeParse(form);

    let errors = {};
    if (!validation.success) {
        validation.error.issues.map(item => item.path.map(path => errors[path] = item.message));
    }

    return errors;
};

const DatabaseFormDialog = ({ database = defaultDatabase(ulid()), create = false }: DatabaseFormProps) => {
    const { model, updateModel } = useModel();
    const [databaseModel, update] = React.useReducer(updateDatabase, { form: database });
    const [displayPassword, setDisplayPassword] = React.useState(false);
    const [currentErrors, setErrors] = React.useState({});
    const [open, setOpen] = React.useState(false);

    const handleOpen = () => {
        update({ type: Type.ResetDatabase, payload: database})
        setErrors({});
        setOpen(true);
    };
    const handleClose = () => setOpen(false);
    const handleClickShowPassword = () => setDisplayPassword(!displayPassword);
    const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault();

    const handleValidation = (event: React.ChangeEvent<HTMLInputElement>) => {
        const errors = validateForm(databaseModel.form);
        setErrors(errors);

        if (Object.keys(errors).length === 0) {
            event.preventDefault();
            handleClose();
            if (create) {
                void addDatabase(databaseModel.form, updateModel);
            } else {
                void editDatabase(databaseModel.form, updateModel);
            }

        }
    };

    const handleFieldUpdate = (fieldName: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        let fieldValue = event.target.value;

        switch (fieldName) {
            case "port":
                fieldValue = parseInt(fieldValue);
        }

        const errors = validateForm({ ...databaseModel.form, [fieldName]: fieldValue });
        setErrors({ ...currentErrors, [fieldName]: errors[fieldName] });

        update({ type: Type.UserUpdatedField, payload: { id: fieldName, value: fieldValue } });
    };

    return (
        <>
            <Button variant="contained" color="primary" onClick={handleOpen}>
                {create ? "Create Database" : "Edit"}
            </Button>
            <Dialog
                fullWidth={true}
                maxWidth="md"
                onClose={handleClose}
                open={open}
                PaperProps={{ component: "form" }}
            >
                <DialogContent sx={{ marginTop: "1em" }}>
                    <Stack spacing={4}>
                        <TextField
                            defaultValue={databaseModel.form.id}
                            error={currentErrors.name}
                            fullWidth
                            helperText={currentErrors.name}
                            id="name"
                            label="Name"
                            onChange={handleFieldUpdate("name")}
                            value={databaseModel.form.name}
                        />
                        <TextField
                            defaultValue={databaseModel.form.driver}
                            error={currentErrors.driver}
                            fullWidth
                            helperText={currentErrors.driver}
                            id="driver"
                            label="Driver"
                            onChange={handleFieldUpdate("driver")}
                            required
                            select
                        >
                            <MenuItem value="postgres">PostgreSQL</MenuItem>
                            <MenuItem value="sqlserver">SQLServer</MenuItem>
                        </TextField>
                        <Stack direction="row" spacing={1}>
                            <TextField
                                error={currentErrors.host}
                                fullWidth
                                helperText={currentErrors.host}
                                id="host"
                                label="Hostname"
                                onChange={handleFieldUpdate("host")}
                                required
                                value={databaseModel.form.host}
                            />
                            <TextField
                                error={currentErrors.port}
                                helperText={currentErrors.port}
                                id="port"
                                label="Port"
                                onChange={handleFieldUpdate("port")}
                                required
                                type="number"
                                value={databaseModel.form.port}
                            />
                        </Stack>
                        <TextField
                            error={currentErrors.database}
                            fullWidth
                            helperText={currentErrors.database}
                            id="database"
                            label="Database"
                            onChange={handleFieldUpdate("database")}
                            required
                            value={databaseModel.form.database}
                        />
                        <TextField
                            error={currentErrors.user}
                            fullWidth
                            helperText={currentErrors.user}
                            id="username"
                            label="Username"
                            onChange={handleFieldUpdate("user")}
                            required
                            value={databaseModel.form.user}
                        />
                        <PasswordField
                            error={currentErrors.password}
                            id="password"
                            label="Password"
                            onChange={handleFieldUpdate("password")}
                            value={databaseModel.form.password}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button
                        color="primary"
                        component="label"
                        onClick={handleValidation}
                        startIcon={<Done />}
                        type="submit"
                        variant="contained"
                    >Submit</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

const DatabasesTable = () => {
    const { model, updateModel } = useModel();
    const [filteringChars, setFilteringChars] = React.useState("");
    const [orderBy, setOrderBy] = React.useState<keyof Database>("id");
    const [order, setOrder] = React.useState<Order>("asc");

    type Order = "asc" | "desc";

    function handleRequestSort(property: keyof Database) {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    }

    const renderDatabases = SRD.match(
        {
            // eslint-disable-next-line react/no-unescaped-entities
            notAsked: () => <p>Let’s fetch some data!</p>,
            loading: () => (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <CircularProgress />
                </Box>
            ),
            failure: (msg: string) => (
                <Alert variant="filled" severity="error" sx={{ m: 4 }}>
                    {`${msg}. Please, reload this page.`}
                </Alert>
            ),
            success: (gotDatabases: Database[]) => {
                const sortedDatabases: Database[] = gotDatabases.slice().sort((a: Database, b: Database) => {
                    const left: string = a[orderBy] as string;
                    const right: string = b[orderBy] as string;
                    return order === "asc" ? left.localeCompare(right) : right.localeCompare(left);
                });

                return (
                    <Stack direction="column" spacing={{ xs: 2 }} sx={{ mx: 12, my: 4 }} useFlexGap>
                        <Autocomplete
                            disablePortal
                            id="filter databases"
                            options={sortedDatabases.map((database: Database) => { return database.name })}
                            onInputChange={(event, newInputValue) => setFilteringChars(newInputValue)}
                            renderInput={(params) => <TextField {...params} label="Search Databases by name" />}
                        />
                        <TableContainer sx={{ height: "400px" }} component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell style={{ fontWeight: "bold", width: "100%" }}>
                                            <TableSortLabel active={orderBy === "name"} direction={order} onClick={() => handleRequestSort("name")}>Name</TableSortLabel>
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody sx={{ width: "100%", overflow: "visible" }}>
                                    {sortedDatabases
                                        .filter((database: Database) => database.id.includes(filteringChars))
                                        .map((database: Database) => {
                                            return (
                                                <TableRow key={database.name}>
                                                    <TableCell>{database.name}</TableCell>
                                                    <TableCell align="center">
                                                        <Chip label={database.driver} size="small" />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                            <Button variant="contained" color="success">Test</Button>
                                                            <DatabaseFormDialog database={database} />
                                                            <ButtonWithConfirmation label="Delete" msg={() => deleteDatabase(database, updateModel)} />
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Stack direction="row" justifyContent="center" spacing={{ sx: 1 }}>
                            <DatabaseFormDialog create={true} />
                        </Stack>
                    </Stack>
                );
            },
        },
        model.databases
    );

    return renderDatabases;
};

export { DatabasesTable, Mode, Msg_, Type };
