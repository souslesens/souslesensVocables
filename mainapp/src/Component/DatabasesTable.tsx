import { useReducer, useState, ChangeEvent, SyntheticEvent, MouseEventHandler, Dispatch } from "react";
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
    IconButton,
} from "@mui/material";
import { Done, Download, Edit } from "@mui/icons-material";

import { SRD } from "srd";
import { ulid } from "ulid";

import { Msg, useModel } from "../Admin";
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

type Msg_ =
    | { type: Type.ResetDatabase; payload: Database }
    | { type: Type.ServerRespondedWithDatabases; payload: { id: string; value: string } }
    | {
          type: Type.UserUpdatedField;
          payload: { id: string; value: string | number };
      };

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

const validateForm = (form: Database) => {
    const validation = DatabaseSchema.safeParse(form);

    const errors: Record<string, string> = {};
    if (!validation.success) {
        validation.error.issues.map((item) => item.path.map((path) => (errors[path] = item.message)));
    }

    return errors;
};

const DatabaseFormDialog = ({ database = defaultDatabase(ulid()), create = false, me = "" }: DatabaseFormProps) => {
    const { updateModel } = useModel();
    const [databaseModel, update] = useReducer(updateDatabase, { form: database });
    const [currentErrors, setErrors] = useState<Record<string, string>>({});
    const [open, setOpen] = useState(false);

    const handleOpen = () => {
        update({ type: Type.ResetDatabase, payload: database });
        setErrors({});
        setOpen(true);
    };
    const handleClose = () => setOpen(false);

    const handleValidation: MouseEventHandler = (event) => {
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
            void writeLog(me, "ConfigEditor", mode, databaseModel.form.name ?? "");
        }
    };

    const handleFieldUpdate = (fieldName: string) => (event: ChangeEvent<HTMLInputElement>) => {
        let fieldValue: string | number = event.target.value;

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
            {create ? (
                <Button variant="contained" color="primary" onClick={handleOpen}>
                    Create Database
                </Button>
            ) : (
                <IconButton color="primary" onClick={handleOpen} title={"Edit"}>
                    <Edit />
                </IconButton>
            )}
            <Dialog fullWidth={true} maxWidth="md" onClose={handleClose} open={open} PaperProps={{ component: "form" }}>
                <DialogContent sx={{ marginTop: "1em" }}>
                    <Stack spacing={4}>
                        <TextField
                            defaultValue={databaseModel.form.id}
                            error={currentErrors.name !== undefined}
                            fullWidth
                            helperText={currentErrors.name}
                            id="name"
                            label="Name"
                            onChange={handleFieldUpdate("name")}
                            value={databaseModel.form.name}
                        />
                        <TextField
                            defaultValue={databaseModel.form.driver}
                            error={currentErrors.driver !== undefined}
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
                                error={currentErrors.host !== undefined}
                                fullWidth
                                helperText={currentErrors.host}
                                id="host"
                                label="Hostname"
                                onChange={handleFieldUpdate("host")}
                                required
                                value={databaseModel.form.host}
                            />
                            <TextField
                                error={currentErrors.port !== undefined}
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
                            error={currentErrors.database !== undefined}
                            fullWidth
                            helperText={currentErrors.database}
                            id="database"
                            label="Database"
                            onChange={handleFieldUpdate("database")}
                            required
                            value={databaseModel.form.database}
                        />
                        <TextField
                            error={currentErrors.user !== undefined}
                            fullWidth
                            helperText={currentErrors.user}
                            id="username"
                            label="Username"
                            onChange={handleFieldUpdate("user")}
                            required
                            value={databaseModel.form.user}
                        />
                        <PasswordField
                            error={currentErrors.password !== undefined}
                            helperText={currentErrors.password}
                            id="password"
                            label="Password"
                            onChange={handleFieldUpdate("password")}
                            value={databaseModel.form.password}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button color="primary" onClick={handleValidation} startIcon={<Done />} type="submit" variant="contained">
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

    const [snackOpen, setSnackOpen] = useState(false);
    const [snackMessage, setSnackMessage] = useState("");

    const me = SRD.withDefault("", model.me);

    type Order = "asc" | "desc";

    const handleCopyIdentifier = (id: string) => {
        setSnackOpen(false);
        void navigator.clipboard.writeText(id);
        setSnackOpen(true);
        setSnackMessage("The identifier has been copied in the clipboard.");
    };

    function handleRequestSort(property: keyof Database) {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    }

    const handleSnackbarClose = (_event: SyntheticEvent | Event, reason?: string) => {
        if (reason === "clickaway") {
            return;
        }
        setSnackOpen(false);
    };

    const handleDeleteDatabase = (database: Database, updateModel: Dispatch<Msg>) => {
        void deleteDatabase(database, updateModel);
        void writeLog(me, "ConfigEditor", "delete", database.name ?? "");
    };

    const renderDatabases = SRD.match(
        {
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
                            inputProps={{ autocomplete: "off" }}
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
                                                        <Chip label={database.id} onClick={() => handleCopyIdentifier(database.id)} size="small" />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip label={database.driver} size="small" />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <TestingButton id={database.id} />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                            <IconButton
                                                                color="primary"
                                                                sx={{
                                                                    // FIXME Need to override the jquery css
                                                                    color: "rgb(25, 118, 210) !important",
                                                                }}
                                                                title={"Download JSON"}
                                                                href={createSingleDatabaseDownloadUrl(
                                                                    // TODO fix typing
                                                                    (model.databases as unknown as Record<string, Database[]>).data,
                                                                    database.id,
                                                                )}
                                                                download={`database-${database.id}.json`}
                                                            >
                                                                <Download />
                                                            </IconButton>
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
                                sx={{
                                    // FIXME Need to override the jquery css
                                    color: "rgb(25, 118, 210) !important",
                                }}
                                href={createDatabasesDownloadUrl(
                                    // TODO fix typing
                                    (model.databases as unknown as Record<string, Database[]>).data,
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
        model.databases,
    );

    return renderDatabases;
};

function createDatabasesDownloadUrl(databases: Database[]): string {
    return jsonToDownloadUrl(databases);
}

function createSingleDatabaseDownloadUrl(databases: Database[], databaseId: string): string {
    const database = databases.find((d) => d.id === databaseId);
    if (database) {
        return jsonToDownloadUrl(database);
    } else {
        return "";
    }
}

export { DatabasesTable, Mode, Type };
