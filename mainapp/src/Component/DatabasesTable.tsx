import { useReducer, useState, ChangeEvent, SyntheticEvent } from "react";
import {
    Button,
    Dialog,
    DialogContent,
    Stack,
    TextField,
    MenuItem,
    DialogActions,
    Box,
    CircularProgress,
    Alert,
    Snackbar,
    TableContainer,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableSortLabel,
    TableBody,
    Chip,
} from "@mui/material";
import { Done } from "@mui/icons-material";

import { SRD } from "srd";
import { ulid } from "ulid";

import { useModel } from "../Admin";
import { ButtonWithConfirmation } from "./ButtonWithConfirmation";
import { PasswordField } from "./PasswordField";
import { TestingButton } from "./TestingButton";
import { addDatabase, Database, DatabaseSchema, defaultDatabase, deleteDatabase, editDatabase } from "../Database";
import { writeLog } from "../Log";
import { cleanUpText, jsonToDownloadUrl } from "../Utils";

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
    me: string;
    database?: Database;
    create?: boolean;
};

type Msg_ = { type: Type.UserUpdatedField; payload: { fieldname: string; newValue: string } };

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
                },
            };
    }
};

const validateForm = (form: DatabaseFormProps) => {
    const validation = DatabaseSchema.safeParse(form);

    const errors = {};
    if (!validation.success) {
        validation.error.issues.map((item) => item.path.map((path) => (errors[path] = item.message)));
    }

    return errors;
};

const DatabaseFormDialog = ({ database = defaultDatabase(ulid()), create = false, me = "" }: DatabaseFormProps) => {
    const { updateModel } = useModel();
    const [databaseModel, update] = useReducer(updateDatabase, { form: database });
    const [currentErrors, setErrors] = useState({});
    const [open, setOpen] = useState(false);

    const handleOpen = () => {
        update({ type: Type.ResetDatabase, payload: database });
        setErrors({});
        setOpen(true);
    };
    const handleClose = () => setOpen(false);

    const handleValidation = (event: ChangeEvent<HTMLInputElement>) => {
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
            const mode = create ? "create" : "edit";
            writeLog(me, "ConfigEditor", mode, databaseModel.form.name);
        }
    };

    const handleFieldUpdate = (fieldName: string) => (event: ChangeEvent<HTMLInputElement>) => {
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
            <Dialog fullWidth={true} maxWidth="md" onClose={handleClose} open={open} PaperProps={{ component: "form" }}>
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
                        <PasswordField error={currentErrors.password} id="password" label="Password" onChange={handleFieldUpdate("password")} value={databaseModel.form.password} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button color="primary" component="label" onClick={handleValidation} startIcon={<Done />} type="submit" variant="contained">
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

const DatabasesTable = () => {
    const { model, updateModel } = useModel();
    const [filteringChars, setFilteringChars] = useState("");
    const [orderBy, setOrderBy] = useState<keyof Database>("id");
    const [order, setOrder] = useState<Order>("asc");

    const [snackOpen, setSnackOpen] = useState<bool>(false);
    const [snackMessage, setSnackMessage] = useState<string>("");

    const me = SRD.withDefault("", model.me);

    type Order = "asc" | "desc";

    const handleCopyIdentifier = async (event: ChangeEvent<HTMLInputElement>) => {
        setSnackOpen(false);
        navigator.clipboard.writeText(event.target.innerText);
        setSnackOpen(true);
        setSnackMessage("The identifier has been copied in the clipboard.");
    };

    function handleRequestSort(property: keyof Database) {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    }

    const handleSnackbarClose = async (event: SyntheticEvent | Event, reason?: string) => {
        if (reason === "clickaway") {
            return;
        }
        setSnackOpen(false);
    };

    const handleDeleteDatabase = async (database: Database, updateModel) => {
        deleteDatabase(database, updateModel);
        writeLog(me, "ConfigEditor", "delete", database.name);
    };

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
                    <Stack direction="column" spacing={{ xs: 2 }} sx={{ m: 4 }} useFlexGap>
                        <Snackbar autoHideDuration={2000} open={snackOpen} onClose={handleSnackbarClose}>
                            <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: "100%" }}>
                                {snackMessage}
                            </Alert>
                        </Snackbar>
                        <TextField
                            label="Search Databases by name"
                            id="filter databases"
                            onChange={(event) => {
                                setFilteringChars(event.target.value);
                            }}
                        />
                        <TableContainer sx={{ height: "400px" }} component={Paper}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell style={{ fontWeight: "bold", width: "100%" }}>
                                            <TableSortLabel active={orderBy === "name"} direction={order} onClick={() => handleRequestSort("name")}>
                                                Name
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell align="center" style={{ fontWeight: "bold" }}>
                                            <TableSortLabel active={orderBy === "id"} direction={order} onClick={() => handleRequestSort("id")}>
                                                Identifier
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell align="center" style={{ fontWeight: "bold" }}>
                                            <TableSortLabel active={orderBy === "driver"} direction={order} onClick={() => handleRequestSort("driver")}>
                                                Driver
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell align="center" style={{ fontWeight: "bold" }}>
                                            Test
                                        </TableCell>
                                        <TableCell align="center" style={{ fontWeight: "bold" }}>
                                            Actions
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody sx={{ width: "100%", overflow: "visible" }}>
                                    {sortedDatabases
                                        .filter((database: Database) => cleanUpText(database.id).includes(cleanUpText(filteringChars)))
                                        .map((database: Database) => {
                                            return (
                                                <TableRow key={database.name}>
                                                    <TableCell>{database.name}</TableCell>
                                                    <TableCell align="center">
                                                        <Chip label={database.id} onClick={handleCopyIdentifier} size="small" />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip label={database.driver} size="small" />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <TestingButton id={database.id} variant="contained" />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                            <DatabaseFormDialog database={database} me={me} />
                                                            <ButtonWithConfirmation label="Delete" msg={() => handleDeleteDatabase(database, updateModel)} />
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                            <Button
                                variant="outlined"
                                href={createDatabasesDownloadUrl(
                                    // TODO fix typing
                                    (model.databases as unknown as Record<string, Database[]>).data
                                )}
                                download={"databases.json"}
                            >
                                Download JSON
                            </Button>
                            <DatabaseFormDialog create={true} me={me} />
                        </Stack>
                    </Stack>
                );
            },
        },
        model.databases
    );

    return renderDatabases;
};

function createDatabasesDownloadUrl(databases: Database[]): string {
    return jsonToDownloadUrl(databases);
}

export { DatabasesTable, Mode, Msg_, Type };
