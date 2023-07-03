import {
    Button,
    Checkbox,
    FormControl,
    FormControlLabel,
    Grid,
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
} from "@mui/material";
import { useModel } from "../Admin";
import * as React from "react";
import { SRD } from "srd";
import { ServerSource, saveSource, defaultSource, deleteSource, InputSourceSchema } from "../Source";
import { identity, style, joinWhenArray } from "../Utils";
import { ulid } from "ulid";
import { ButtonWithConfirmation } from "./ButtonWithConfirmation";
import TableSortLabel from "@mui/material/TableSortLabel";
import Autocomplete from "@mui/material/Autocomplete";
import CsvDownloader from "react-csv-downloader";
import { Datas } from "react-csv-downloader/dist/esm/lib/csv";
import { useZorm, createCustomIssues } from "react-zorm";
import { errorMessage } from "./errorMessage";
import { ZodCustomIssueWithMessage } from "react-zorm/dist/types";
const SourcesTable = () => {
    const { model, updateModel } = useModel();

    const [filteringChars, setFilteringChars] = React.useState("");
    const [orderBy, setOrderBy] = React.useState<keyof ServerSource>("name");
    const [order, setOrder] = React.useState<Order>("asc");
    type Order = "asc" | "desc";
    function handleRequestSort(property: keyof ServerSource) {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    }

    const renderSources = SRD.match(
        {
            notAsked: () => <p>Let&aposs fetch some data!</p>,
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
            success: (gotSources: ServerSource[]) => {
                const datas = gotSources.map((source) => {
                    const { sparql_server, dataSource, predicates, imports, taxonomyPredicates, isDraft, editable, allowIndividuals, ...restOfProperties } = source;
                    const processedData = {
                        ...restOfProperties,
                        editable: editable ? "Editable" : "Not Editable",
                        isDraft: isDraft ? "IsDraft" : "Not a draft",
                        allowIndividuals: allowIndividuals ? "allowIndividuals" : "Not allowIndividuals",
                        imports: joinWhenArray(imports),
                        taxonomyPredicates: joinWhenArray(taxonomyPredicates),
                    };

                    const dataWithoutCarriageReturns = Object.fromEntries(
                        Object.entries(processedData).map(([key, value]) => {
                            if (typeof value === "string") {
                                return [key, value.replace("\n", " ")];
                            }
                            return [key, value];
                        })
                    );

                    return { ...dataWithoutCarriageReturns };
                });
                const sortedSources: ServerSource[] = gotSources.slice().sort((a: ServerSource, b: ServerSource) => {
                    const left: string = a[orderBy] as string;
                    const right: string = b[orderBy] as string;
                    return order === "asc" ? left.localeCompare(right) : right.localeCompare(left);
                });
                return (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                        <Stack>
                            <CsvDownloader separator="&#9;" filename="sources" extension=".tsv" datas={datas as Datas} />
                            <Autocomplete
                                disablePortal
                                id="search-sources"
                                options={gotSources.map((source) => source.name)}
                                sx={{ width: 300 }}
                                onInputChange={(event, newInputValue) => {
                                    setFilteringChars(newInputValue);
                                }}
                                renderInput={(params) => <TextField {...params} label="Search Sources by name" />}
                            />{" "}
                            <Box id="table-container" sx={{ justifyContent: "center", height: "400px", display: "flex" }}>
                                <TableContainer sx={{ height: "400px" }} component={Paper}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell style={{ fontWeight: "bold" }}>
                                                    <TableSortLabel active={orderBy === "name"} direction={order} onClick={() => handleRequestSort("name")}>
                                                        Name
                                                    </TableSortLabel>
                                                </TableCell>
                                                <TableCell style={{ fontWeight: "bold" }}>graphUri</TableCell>
                                                <TableCell style={{ fontWeight: "bold" }}>Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody sx={{ width: "100%", overflow: "visible" }}>
                                            {sortedSources
                                                .filter((source) => source.name.includes(filteringChars))
                                                .map((source) => {
                                                    return (
                                                        <TableRow key={source.name}>
                                                            <TableCell>{source.name}</TableCell>
                                                            <TableCell>{source.graphUri}</TableCell>
                                                            <TableCell>
                                                                <Box sx={{ display: "flex" }}>
                                                                    <SourceForm source={source} />
                                                                    <ButtonWithConfirmation label="Delete" msg={() => deleteSource(source, updateModel)} />
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
                                <SourceForm create={true} />
                            </Box>
                        </Stack>
                    </Box>
                );
            },
        },
        model.sources
    );

    return renderSources;
};

type SourceEditionState = { modal: boolean; sourceForm: ServerSource };

const enum Type {
    UserClickedModal,
    UserUpdatedField,
    ResetSource,
    UserAddedGraphUri,
    UserClickedCheckBox,
    UserUpdatedPredicates,
    UserClickedAddDataSource,
    UserUpdatedDataSource,
    UserUpdatedsparql_server,
}

const enum Mode {
    Creation,
    Edition,
}

type Msg_ =
    | { type: Type.UserClickedModal; payload: boolean }
    | { type: Type.UserUpdatedField; payload: { fieldname: string; newValue: string | string[] } }
    | { type: Type.ResetSource; payload: Mode }
    | { type: Type.UserAddedGraphUri; payload: string }
    | { type: Type.UserClickedCheckBox; payload: { checkboxName: string; value: boolean } }
    | { type: Type.UserUpdatedPredicates; payload: { broaderPredicate: string; lang: string } }
    | { type: Type.UserClickedAddDataSource; payload: boolean }
    | {
          type: Type.UserUpdatedDataSource;
          payload: { type: string[]; table_schema: string; connection: string; dbName: string; local_dictionary: { table: string; labelColumn: string; idColumn: string } };
      }
    | { type: Type.UserUpdatedsparql_server; payload: { url: string; method: string; headers: string[] } };

const updateSource = (sourceEditionState: SourceEditionState, msg: Msg_): SourceEditionState => {
    const { model } = useModel();
    const unwrappedSources = SRD.unwrap([], identity, model.sources);
    const getUnmodifiedSources = unwrappedSources.reduce((acc, value) => (sourceEditionState.sourceForm.id === value.id ? value : acc), defaultSource(ulid()));
    const resetSourceForm = msg.payload ? sourceEditionState.sourceForm : getUnmodifiedSources;
    const fieldToUpdate: any = msg.type === Type.UserUpdatedField ? msg.payload.fieldname : null;
    switch (msg.type) {
        case Type.UserClickedModal:
            return { ...sourceEditionState, modal: msg.payload };

        case Type.UserUpdatedField:
            return { ...sourceEditionState, sourceForm: { ...sourceEditionState.sourceForm, [fieldToUpdate]: msg.payload.newValue } };

        case Type.UserAddedGraphUri:
            return { ...sourceEditionState, sourceForm: { ...sourceEditionState.sourceForm, graphUri: msg.payload } };

        case Type.UserClickedAddDataSource:
            return {
                ...sourceEditionState,
                sourceForm: {
                    ...sourceEditionState.sourceForm,
                    dataSource: msg.payload ? { type: [], table_schema: "", connection: "", dbName: "", local_dictionary: { table: "", labelColumn: "", idColumn: "" } } : null,
                },
            };

        case Type.UserClickedCheckBox:
            return { ...sourceEditionState, sourceForm: { ...sourceEditionState.sourceForm, [msg.payload.checkboxName]: msg.payload.value } };

        case Type.UserUpdatedPredicates:
            return { ...sourceEditionState, sourceForm: { ...sourceEditionState.sourceForm, predicates: msg.payload } };

        case Type.UserUpdatedDataSource:
            return { ...sourceEditionState, sourceForm: { ...sourceEditionState.sourceForm, dataSource: msg.payload } };

        case Type.UserUpdatedsparql_server:
            return { ...sourceEditionState, sourceForm: { ...sourceEditionState.sourceForm, sparql_server: msg.payload } };

        case Type.ResetSource:
            switch (msg.payload) {
                case Mode.Creation:
                    return { ...sourceEditionState, sourceForm: defaultSource(ulid()) };

                case Mode.Edition:
                    return { ...sourceEditionState, sourceForm: msg.payload ? sourceEditionState.sourceForm : resetSourceForm };
            }
    }
};

type SourceFormProps = {
    source?: ServerSource;
    create?: boolean;
};

const SourceForm = ({ source = defaultSource(ulid()), create = false }: SourceFormProps) => {
    const { model, updateModel } = useModel();
    const unwrappedSources = SRD.unwrap([], identity, model.sources);
    const sources = React.useMemo(() => unwrappedSources, [unwrappedSources]);

    const [sourceModel, update] = React.useReducer(updateSource, { modal: false, sourceForm: source });
    const [issues, setIssues] = React.useState<ZodCustomIssueWithMessage[]>([]);
    const schemaTypes = [...new Set(sources.map((source) => source.schemaType))];

    const zo = useZorm("source-form", InputSourceSchema, { setupListeners: false, customIssues: issues });
    const [isAfterSubmission, setIsAfterSubmission] = React.useState<boolean>(false);
    const handleOpen = () => update({ type: Type.UserClickedModal, payload: true });
    const handleClose = () => update({ type: Type.UserClickedModal, payload: false });
    const handleFieldUpdate = (fieldname: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        update({ type: Type.UserUpdatedField, payload: { fieldname: fieldname, newValue: event.target.value } });
    };

    const handleTaxonomyPredicatesUpdate = (value: string[]) => {
        update({ type: Type.UserUpdatedField, payload: { fieldname: "taxonomyPredicates", newValue: value } });
    };

    const _handleFieldUpdate = (event: React.ChangeEvent<HTMLInputElement>) => update({ type: Type.UserAddedGraphUri, payload: event.target.value });

    const handleSparql_serverUpdate = (fieldName: string) => (event: React.ChangeEvent<HTMLTextAreaElement>) =>
        update({
            type: Type.UserUpdatedsparql_server,
            payload: { ...sourceModel.sourceForm.sparql_server, [fieldName]: fieldName === "headers" ? event.target.value.replace(/\s+/g, "").split(",") : event.target.value },
        });
    const handleCheckbox = (checkboxName: string) => (event: React.ChangeEvent<HTMLInputElement>) =>
        update({ type: Type.UserClickedCheckBox, payload: { checkboxName: checkboxName, value: event.target.checked } });

    const knownTaxonomyPredicates = [
        ...new Set(
            sources.flatMap((source) => {
                return source.taxonomyPredicates;
            })
        ),
    ];
    function validateSourceName(sourceName: string) {
        const issues = createCustomIssues(InputSourceSchema);

        if (sources.reduce((acc, s) => (acc ||= s.name === sourceName), false)) {
            issues.name(`Source's name ${sourceName} is already in use`);
        }

        return {
            issues: issues.toArray(),
        };
    }
    const saveSources = () => {
        void saveSource(sourceModel.sourceForm, create ? Mode.Creation : Mode.Edition, updateModel, update);
    };
    const createIssues = (issue: ZodCustomIssueWithMessage[]) => setIssues(issue);
    const validateAfterSubmission = () => {
        if (isAfterSubmission) {
            zo.validate();
        }
    };
    return (
        <>
            <Button color="primary" variant="contained" onClick={handleOpen}>
                {create ? "Create Source" : "Edit"}
            </Button>
            <Modal onClose={handleClose} open={sourceModel.modal}>
                <Box
                    component="form"
                    ref={zo.ref}
                    onSubmit={(e) => {
                        const validation = zo.validate();
                        if (!validation.success) {
                            e.preventDefault();
                            console.error("error", e);
                            setIsAfterSubmission(true);
                            return;
                        }
                        e.preventDefault();
                        saveSources();
                        setIsAfterSubmission(false);
                    }}
                    sx={style}
                >
                    <Grid container spacing={4}>
                        <Grid item xs={3}>
                            <FormControlLabel control={<Checkbox checked={sourceModel.sourceForm.editable} onChange={handleCheckbox("editable")} />} label="Is this source editable?" />
                        </Grid>
                        <Grid item xs={3}>
                            <FormControlLabel control={<Checkbox checked={sourceModel.sourceForm.isDraft} onChange={handleCheckbox("isDraft")} />} label="Is it a draft?" />
                        </Grid>
                        <Grid item xs={3}>
                            <FormControlLabel control={<Checkbox checked={sourceModel.sourceForm.allowIndividuals} onChange={handleCheckbox("allowIndividuals")} />} label="Allow individuals?" />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                name={zo.fields.name()}
                                helperText={errorMessage(zo.errors.name)}
                                onBlur={() => {
                                    const isUniq = validateSourceName(sourceModel.sourceForm.name);
                                    createIssues(isUniq.issues);
                                    validateAfterSubmission();
                                }}
                                fullWidth
                                onChange={handleFieldUpdate("name")}
                                value={sourceModel.sourceForm.name}
                                id={`name`}
                                label={"Name"}
                                variant="standard"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                helperText={errorMessage(zo.errors.graphUri)}
                                name={zo.fields.graphUri()}
                                onBlur={validateAfterSubmission}
                                onChange={_handleFieldUpdate}
                                value={sourceModel.sourceForm.graphUri}
                                id={`graphUris`}
                                label={"graph' Uris"}
                                variant="standard"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                onChange={handleSparql_serverUpdate("method")}
                                value={sourceModel.sourceForm.sparql_server.method}
                                id={`sparql_server_Method`}
                                label={"Sparql server method"}
                                variant="standard"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                onChange={handleSparql_serverUpdate("url")}
                                value={sourceModel.sourceForm.sparql_server.url}
                                id={`sparql_server_url`}
                                label={"Sparql server url"}
                                variant="standard"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                onChange={handleSparql_serverUpdate("headers")}
                                value={sourceModel.sourceForm.sparql_server.headers}
                                id={`sparql_server_headers`}
                                label={"Sparql server headers"}
                                variant="standard"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                onChange={handleFieldUpdate("topClassFilter")}
                                value={sourceModel.sourceForm.topClassFilter}
                                id={`topClassFilter`}
                                label={"Top Class filter"}
                                variant="standard"
                            />
                        </Grid>

                        <Grid item xs={6}>
                            <FormControl>
                                <InputLabel id="controller">Controller</InputLabel>
                                <Select
                                    labelId="controller"
                                    id="controller-select"
                                    value={sourceModel.sourceForm.controller}
                                    label="select-controller"
                                    fullWidth
                                    style={{ width: "400px" }}
                                    renderValue={(selected: string | string[]) => (typeof selected === "string" ? selected : selected.join(", "))}
                                    onChange={handleFieldUpdate("controller")}
                                >
                                    {["Sparql_OWL", "Sparql_SKOS", "Sparql_INDIVIDUALS"].map((schemaType) => (
                                        <MenuItem key={schemaType} value={schemaType}>
                                            {schemaType}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                helperText={errorMessage(zo.errors.group)}
                                onBlur={validateAfterSubmission}
                                onChange={handleFieldUpdate("group")}
                                value={sourceModel.sourceForm.group}
                                id={`group`}
                                label={"Group"}
                                variant="standard"
                            />
                        </Grid>

                        <Grid item xs={6}>
                            <FormControl>
                                <InputLabel id="imports-label">Imports</InputLabel>
                                <Select
                                    labelId="imports-label"
                                    id="imports"
                                    value={sourceModel.sourceForm.imports}
                                    label="imports-label"
                                    fullWidth
                                    multiple
                                    style={{ width: "400px" }}
                                    renderValue={(selected: string | string[]) => (typeof selected === "string" ? selected : selected.join(", "))}
                                    onChange={handleFieldUpdate("imports")}
                                >
                                    {sources.map((source) => (
                                        <MenuItem key={source.name} value={source.name}>
                                            <Checkbox checked={sourceModel.sourceForm.imports.indexOf(source.name) > -1} />
                                            {source.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <FormControl>
                                <Autocomplete
                                    multiple
                                    limitTags={2}
                                    id="taxonomy-predicates"
                                    options={knownTaxonomyPredicates}
                                    value={sourceModel.sourceForm.taxonomyPredicates}
                                    freeSolo
                                    onChange={(e, value) => handleTaxonomyPredicatesUpdate(value)}
                                    style={{ width: "400px" }}
                                    renderInput={(params) => <TextField {...params} variant="filled" label="Taxonomy Predicates" />}
                                />
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <FormControl>
                                <InputLabel id="schemaType-label">Schema type</InputLabel>
                                <Select
                                    labelId="schemaType-label"
                                    id="schemaType"
                                    value={sourceModel.sourceForm.schemaType}
                                    label="select-schemaTyoe-label"
                                    fullWidth
                                    style={{ width: "400px" }}
                                    renderValue={(selected: string | string[]) => (typeof selected === "string" ? selected : selected.join(", "))}
                                    onChange={handleFieldUpdate("schemaType")}
                                >
                                    {schemaTypes.map((schemaType) => (
                                        <MenuItem key={schemaType} value={schemaType}>
                                            <Checkbox checked={sourceModel.sourceForm.schemaType.indexOf(schemaType) > -1} />
                                            {schemaType}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <FormGivenSchemaType update={update} model={sourceModel} />

                        <Grid item xs={12} style={{ textAlign: "center" }}>
                            <Button disabled={zo.validation?.success === false || zo.customIssues.length > 0} color="primary" type="submit" variant="contained">
                                Save Source
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Modal>
        </>
    );
};

const FormGivenSchemaType = (props: { model: SourceEditionState; update: React.Dispatch<Msg_> }) => {
    const handlePredicateUpdate = (fieldName: string) => (event: React.ChangeEvent<HTMLTextAreaElement>) =>
        props.update({ type: Type.UserUpdatedPredicates, payload: { ...props.model.sourceForm.predicates, [fieldName]: event.target.value } });
    const handleDataSourceUpdate = (fieldName: string) => (event: React.ChangeEvent<HTMLInputElement>) =>
        props.update({
            type: Type.UserUpdatedDataSource,
            payload: props.model.sourceForm.dataSource
                ? { ...props.model.sourceForm.dataSource, [fieldName]: event.target.value }
                : { type: [], table_schema: "string", connection: "string", dbName: "string", local_dictionary: { table: "string", labelColumn: "string", idColumn: "string" } },
        });

    const handleAddDataSource = (event: React.ChangeEvent<HTMLInputElement>) => props.update({ type: Type.UserClickedAddDataSource, payload: event.target.checked });
    const dataSource = props.model.sourceForm.dataSource;

    switch (props.model.sourceForm.schemaType) {
        case "SKOS":
            return (
                <>
                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            onChange={handlePredicateUpdate("broaderPredicate")}
                            value={props.model.sourceForm.predicates.broaderPredicate}
                            id={`broaderPredicate`}
                            label={"Broader Predicate"}
                            variant="standard"
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField fullWidth onChange={handlePredicateUpdate("lang")} value={props.model.sourceForm.predicates.lang} id={`predicateLang`} label={"Language"} variant="standard" />
                    </Grid>
                </>
            );
        case "KNOWLEDGE_GRAPH":
            return (
                <>
                    <Grid item xs={3}>
                        <FormControlLabel control={<Checkbox checked={props.model.sourceForm.dataSource ? true : false} onChange={handleAddDataSource} />} label="Do you want to add a data source ?" />
                    </Grid>

                    <Grid item xs={6}>
                        <FormControl>
                            <InputLabel id="dataSource-type">DataSource&aposs type</InputLabel>
                            <Select
                                labelId="dataSource-type"
                                id="dataSource"
                                value={props.model.sourceForm.dataSource ? props.model.sourceForm.dataSource.type : []}
                                label="Data source's type"
                                fullWidth
                                multiple
                                style={{ width: "400px" }}
                                renderValue={(selected: string | string[]) => (typeof selected === "string" ? selected : selected.join(", "))}
                                onChange={handleDataSourceUpdate("type")}
                            >
                                {["sql.sqlserver"].map((type) => (
                                    <MenuItem key={type} value={type}>
                                        {type}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            onChange={handleDataSourceUpdate("connection")}
                            value={props.model.sourceForm.dataSource ? props.model.sourceForm.dataSource.connection : ""}
                            id={`connection`}
                            label={"Connection"}
                            variant="standard"
                            style={{ display: !dataSource ? "none" : "" }}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            onChange={handleDataSourceUpdate("dbName")}
                            value={props.model.sourceForm.dataSource ? props.model.sourceForm.dataSource.dbName : ""}
                            id={`dbName`}
                            label={"Data Base's Name"}
                            variant="standard"
                            style={{ display: !dataSource ? "none" : "" }}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            onChange={handleDataSourceUpdate("table_schema")}
                            value={props.model.sourceForm.dataSource ? props.model.sourceForm.dataSource.table_schema : ""}
                            id={`table_schema`}
                            label={"Table Schema"}
                            style={{ display: !dataSource ? "none" : "" }}
                            variant="standard"
                        />
                    </Grid>
                </>
            );
        default:
            return <div></div>;
    }
};
export { SourcesTable, Msg_, Type, Mode };
