/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as Mui from "@mui/material";
import * as MuiIcons from "@mui/icons-material";
import * as React from "react";

import { SRD } from "srd";
import { ulid } from "ulid";

import { useModel } from "../Admin";
import { ButtonWithConfirmation } from "./ButtonWithConfirmation";
import { PasswordField } from "./PasswordField";
import { TestingButton } from "./TestingButton";
import { addDatabase, Database, DatabaseSchema, defaultDatabase, deleteDatabase, editDatabase, SourceAccessControl } from "../Database";
import { writeLog } from "../Log";
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

    let errors = {};
    if (!validation.success) {
        validation.error.issues.map((item) => item.path.map((path) => (errors[path] = item.message)));
    }

    return errors;
};

const DatabaseFormDialog = ({ database = defaultDatabase(ulid()), create = false, me = "" }: DatabaseFormProps) => {
    const { updateModel } = useModel();
    const [databaseModel, update] = React.useReducer(updateDatabase, { form: database });
    const [displayPassword, setDisplayPassword] = React.useState(false);
    const [currentErrors, setErrors] = React.useState({});
    const [open, setOpen] = React.useState(false);

    const handleOpen = () => {
        update({ type: Type.ResetDatabase, payload: database });
        setErrors({});
        setOpen(true);
    };
    const handleClose = () => setOpen(false);

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
            const mode = create ? "create" : "edit";
            writeLog(me, "ConfigEditor", mode, databaseModel.form.name);
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
            <Mui.Button variant="contained" color="primary" onClick={handleOpen}>
                {create ? "Create Database" : "Edit"}
            </Mui.Button>
            <Mui.Dialog fullWidth={true} maxWidth="md" onClose={handleClose} open={open} PaperProps={{ component: "form" }}>
                <Mui.DialogContent sx={{ marginTop: "1em" }}>
                    <Mui.Stack spacing={4}>
                        <Mui.TextField
                            defaultValue={databaseModel.form.id}
                            error={currentErrors.name}
                            fullWidth
                            helperText={currentErrors.name}
                            id="name"
                            label="Name"
                            onChange={handleFieldUpdate("name")}
                            value={databaseModel.form.name}
                        />
                        <Mui.TextField
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
                            <Mui.MenuItem value="postgres">PostgreSQL</Mui.MenuItem>
                            <Mui.MenuItem value="sqlserver">SQLServer</Mui.MenuItem>
                        </Mui.TextField>
                        <Mui.Stack direction="row" spacing={1}>
                            <Mui.TextField
                                error={currentErrors.host}
                                fullWidth
                                helperText={currentErrors.host}
                                id="host"
                                label="Hostname"
                                onChange={handleFieldUpdate("host")}
                                required
                                value={databaseModel.form.host}
                            />
                            <Mui.TextField
                                error={currentErrors.port}
                                helperText={currentErrors.port}
                                id="port"
                                label="Port"
                                onChange={handleFieldUpdate("port")}
                                required
                                type="number"
                                value={databaseModel.form.port}
                            />
                        </Mui.Stack>
                        <Mui.TextField
                            error={currentErrors.database}
                            fullWidth
                            helperText={currentErrors.database}
                            id="database"
                            label="Database"
                            onChange={handleFieldUpdate("database")}
                            required
                            value={databaseModel.form.database}
                        />
                        <Mui.TextField
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
                    </Mui.Stack>
                </Mui.DialogContent>
                <Mui.DialogActions>
                    <Mui.Button color="primary" component="label" onClick={handleValidation} startIcon={<MuiIcons.Done />} type="submit" variant="contained">
                        Submit
                    </Mui.Button>
                </Mui.DialogActions>
            </Mui.Dialog>
        </>
    );
};

const DatabasesTable = () => {
    const { model, updateModel } = useModel();
    const [filteringChars, setFilteringChars] = React.useState("");
    const [orderBy, setOrderBy] = React.useState<keyof Database>("id");
    const [order, setOrder] = React.useState<Order>("asc");

    const [snackOpen, setSnackOpen] = React.useState<bool>(false);
    const [snackMessage, setSnackMessage] = React.useState<string>("");

    const me = SRD.withDefault("", model.me);

    type Order = "asc" | "desc";

    const handleCopyIdentifier = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    const handleSnackbarClose = async (event: React.SyntheticEvent | Event, reason?: string) => {
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
                <Mui.Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <Mui.CircularProgress />
                </Mui.Box>
            ),
            failure: (msg: string) => (
                <Mui.Alert variant="filled" severity="error" sx={{ m: 4 }}>
                    {`${msg}. Please, reload this page.`}
                </Mui.Alert>
            ),
            success: (gotDatabases: Database[]) => {
                const sortedDatabases: Database[] = gotDatabases.slice().sort((a: Database, b: Database) => {
                    const left: string = a[orderBy] as string;
                    const right: string = b[orderBy] as string;
                    return order === "asc" ? left.localeCompare(right) : right.localeCompare(left);
                });

                return (
                    <Mui.Stack direction="column" spacing={{ xs: 2 }} sx={{ m: 4 }} useFlexGap>
                        <Mui.Snackbar autoHideDuration={2000} open={snackOpen} onClose={handleSnackbarClose}>
                            <Mui.Alert onClose={handleSnackbarClose} severity="success" sx={{ width: "100%" }}>
                                {snackMessage}
                            </Mui.Alert>
                        </Mui.Snackbar>
                        <Mui.Autocomplete
                            disablePortal
                            id="filter databases"
                            options={sortedDatabases.map((database: Database) => {
                                return database.name;
                            })}
                            onInputChange={(event, newInputValue) => setFilteringChars(newInputValue)}
                            renderInput={(params) => <Mui.TextField {...params} label="Search Databases by name" />}
                        />
                        <Mui.TableContainer sx={{ height: "400px" }} component={Mui.Paper}>
                            <Mui.Table stickyHeader>
                                <Mui.TableHead>
                                    <Mui.TableRow>
                                        <Mui.TableCell style={{ fontWeight: "bold", width: "100%" }}>
                                            <Mui.TableSortLabel active={orderBy === "name"} direction={order} onClick={() => handleRequestSort("name")}>
                                                Name
                                            </Mui.TableSortLabel>
                                        </Mui.TableCell>
                                        <Mui.TableCell align="center" style={{ fontWeight: "bold" }}>
                                            <Mui.TableSortLabel active={orderBy === "id"} direction={order} onClick={() => handleRequestSort("id")}>
                                                Identifier
                                            </Mui.TableSortLabel>
                                        </Mui.TableCell>
                                        <Mui.TableCell align="center" style={{ fontWeight: "bold" }}>
                                            <Mui.TableSortLabel active={orderBy === "driver"} direction={order} onClick={() => handleRequestSort("driver")}>
                                                Driver
                                            </Mui.TableSortLabel>
                                        </Mui.TableCell>
                                        <Mui.TableCell align="center" style={{ fontWeight: "bold" }}>
                                            Test
                                        </Mui.TableCell>
                                        <Mui.TableCell align="center" style={{ fontWeight: "bold" }}>
                                            Actions
                                        </Mui.TableCell>
                                    </Mui.TableRow>
                                </Mui.TableHead>
                                <Mui.TableBody sx={{ width: "100%", overflow: "visible" }}>
                                    {sortedDatabases
                                        .filter((database: Database) => database.id.includes(filteringChars))
                                        .map((database: Database) => {
                                            return (
                                                <Mui.TableRow key={database.name}>
                                                    <Mui.TableCell>{database.name}</Mui.TableCell>
                                                    <Mui.TableCell align="center">
                                                        <Mui.Chip label={database.id} onClick={handleCopyIdentifier} size="small" />
                                                    </Mui.TableCell>
                                                    <Mui.TableCell align="center">
                                                        <Mui.Chip label={database.driver} size="small" />
                                                    </Mui.TableCell>
                                                    <Mui.TableCell align="center">
                                                        <TestingButton id={database.id} variant="contained" />
                                                    </Mui.TableCell>
                                                    <Mui.TableCell align="center">
                                                        <Mui.Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                            <DatabaseFormDialog database={database} me={me} />
                                                            <ButtonWithConfirmation label="Delete" msg={() => handleDeleteDatabase(database, updateModel)} />
                                                        </Mui.Stack>
                                                    </Mui.TableCell>
                                                </Mui.TableRow>
                                            );
                                        })}
                                </Mui.TableBody>
                            </Mui.Table>
                        </Mui.TableContainer>
                        <Mui.Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                            <DatabaseFormDialog create={true} me={me} />
                        </Mui.Stack>
                    </Mui.Stack>
                );
            },
        },
        model.databases
    );

    return renderDatabases;
};

export { DatabasesTable, Mode, Msg_, Type };
