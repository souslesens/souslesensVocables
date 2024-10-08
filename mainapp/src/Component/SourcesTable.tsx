import { Fragment, useState, useMemo, useReducer, ChangeEvent, useEffect, Dispatch } from "react";
import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    Link,
    MenuItem,
    Modal,
    Paper,
    Select,
    SelectChangeEvent,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    TextField,
    Tooltip,
} from "@mui/material";
import { green, pink, grey } from "@mui/material/colors";
import { Add, Circle, Download, Edit, Remove } from "@mui/icons-material";

import CsvDownloader from "react-csv-downloader";
import { Datas } from "react-csv-downloader/dist/esm/lib/csv";
import { useZorm, createCustomIssues, ZodCustomIssueWithMessage } from "react-zorm";
import { SRD } from "srd";
import { ulid } from "ulid";

import { Msg, useModel } from "../Admin";
import { ServerSource, saveSource, defaultSource, deleteSource, sourceHelp, InputSourceSchema, InputSourceSchemaCreate, getGraphSize } from "../Source";
import { writeLog } from "../Log";
import { identity, style, joinWhenArray, humanizeSize, cleanUpText, jsonToDownloadUrl } from "../Utils";
import { HelpButton } from "./HelpModal";
import { ButtonWithConfirmation } from "./ButtonWithConfirmation";
import { errorMessage } from "./errorMessage";

type OrderBy = "name" | "graphUri" | "graphSize" | "group";

const SourcesTable = () => {
    const { model, updateModel } = useModel();
    const [filteringChars, setFilteringChars] = useState("");
    const [orderBy, setOrderBy] = useState<OrderBy>("name");
    const [order, setOrder] = useState<Order>("asc");
    type Order = "asc" | "desc";
    function handleRequestSort(property: OrderBy) {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    }

    const me = SRD.withDefault("", model.me);
    const indices = SRD.withDefault(null, model.indices);
    const graphs = SRD.withDefault(null, model.graphs);

    const handleDeleteSource = (source: ServerSource, updateModel: Dispatch<Msg>) => {
        void deleteSource(source, updateModel);
        void writeLog(me, "ConfigEditor", "delete", source.name);
    };

    const renderSources = SRD.match(
        {
            notAsked: () => <p>Let&apos;s fetch some data!</p>,
            loading: () => (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <CircularProgress />
                </Box>
            ),
            failure: (msg: string) => (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <p>{`I stumbled into this error when I tried to fetch data: ${msg}. Please, reload this page.`}</p>
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
                const sortedSources: ServerSource[] = gotSources.slice().sort((a, b) => {
                    if (orderBy == "graphSize") {
                        const left_n: number = getGraphSize(a, graphs);
                        const right_n: number = getGraphSize(b, graphs);
                        return order === "asc" ? left_n - right_n : right_n - left_n;
                    } else {
                        const left: string = a[orderBy] || ("" as string);
                        const right: string = b[orderBy] || ("" as string);
                        return order === "asc" ? left.localeCompare(right) : right.localeCompare(left);
                    }
                });

                return (
                    <Stack direction="column" spacing={{ xs: 2 }} sx={{ m: 4 }} useFlexGap>
                        <TextField
                            label="Search Sources by name"
                            id="search-sources"
                            onChange={(event) => {
                                setFilteringChars(event.target.value);
                            }}
                        />
                        <TableContainer sx={{ height: "400px" }} component={Paper}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell style={{ fontWeight: "bold" }}>
                                            <TableSortLabel active={orderBy === "name"} direction={order} onClick={() => handleRequestSort("name")}>
                                                Name
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell style={{ fontWeight: "bold", width: "100%" }}>
                                            <TableSortLabel active={orderBy === "graphUri"} direction={order} onClick={() => handleRequestSort("graphUri")}>
                                                Graph URI
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell align="center" style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                                            <TableSortLabel active={orderBy === "graphSize"} direction={order} onClick={() => handleRequestSort("graphSize")}>
                                                Graph size
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell align="center" style={{ fontWeight: "bold" }}>
                                            <TableSortLabel active={orderBy === "group"} direction={order} onClick={() => handleRequestSort("group")}>
                                                Group
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell align="center" style={{ fontWeight: "bold" }}>
                                            Data
                                        </TableCell>
                                        <TableCell align="center" style={{ fontWeight: "bold" }}>
                                            Actions
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody sx={{ width: "100%", overflow: "visible" }}>
                                    {sortedSources
                                        .filter((source) => cleanUpText(source.name).includes(cleanUpText(filteringChars)))
                                        .map((source) => {
                                            const haveIndices = indices ? indices.includes(source.name.toLowerCase()) : false;
                                            const graphInfo = graphs?.find((g) => g.name === source.graphUri);
                                            const haveGraphs = graphInfo !== undefined;

                                            return (
                                                <TableRow key={source.name}>
                                                    <TableCell>{source.name}</TableCell>
                                                    <TableCell>
                                                        <Link href={source.graphUri}>{source.graphUri}</Link>
                                                    </TableCell>
                                                    <TableCell align="center">{humanizeSize(getGraphSize(source, graphs))}</TableCell>
                                                    <TableCell align="center">{source.group ? <Chip label={source.group} size="small" /> : ""}</TableCell>
                                                    <TableCell align="center">
                                                        <Stack direction="row" justifyContent="center" useFlexGap>
                                                            <Tooltip title="RDF Graph">
                                                                <Circle sx={{ color: graphs !== null ? (haveGraphs ? green[500] : pink[500]) : grey[500] }} />
                                                            </Tooltip>
                                                            <Tooltip title="ElasticSearch indices">
                                                                <Circle sx={{ color: indices !== null ? (haveIndices ? green[500] : pink[500]) : grey[500] }} />
                                                            </Tooltip>
                                                        </Stack>
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
                                                                href={createSingleSourceDownloadUrl(
                                                                    // TODO fix typing
                                                                    (model.sources as unknown as Record<string, ServerSource[]>)["data"],
                                                                    source.name
                                                                )}
                                                                download={`source${source.name}.json`}
                                                            >
                                                                <Download />
                                                            </IconButton>
                                                            <SourceForm source={source} me={me} />
                                                            <ButtonWithConfirmation label="Delete" msg={() => handleDeleteSource(source, updateModel)} />
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
                                href={createSourcesDownloadUrl(
                                    // TODO fix typing
                                    (model.sources as unknown as Record<string, ServerSource[]>)["data"]
                                )}
                                download={"sources.json"}
                            >
                                Download JSON
                            </Button>
                            <CsvDownloader separator="&#9;" filename="sources" extension=".tsv" datas={datas as Datas}>
                                <Button variant="outlined">Download CSV</Button>
                            </CsvDownloader>
                            <SourceForm create={true} me={me} />
                        </Stack>
                    </Stack>
                );
            },
        },
        model.sources
    );

    return renderSources;
};

function createSourcesDownloadUrl(sources: ServerSource[]): string {
    const sourcesObject: Record<string, ServerSource> = {};
    for (const s of sources) {
        sourcesObject[s.name] = s;
    }
    return jsonToDownloadUrl(sourcesObject);
}

function createSingleSourceDownloadUrl(sources: ServerSource[], sourceName: string): string {
    const source = sources.find((s) => s.name === sourceName);
    if (source) {
        return jsonToDownloadUrl(source);
    } else {
        return "";
    }
}

type SparqlServerHeadersFormData = { key: string; value: string }[];
type SourceFormData = Omit<ServerSource, "sparql_server"> & { sparql_server: Omit<ServerSource["sparql_server"], "headers"> & { headers: SparqlServerHeadersFormData } };

function toFormData(source: ServerSource): SourceFormData {
    return {
        ...source,
        sparql_server: {
            ...source.sparql_server,
            headers: Object.entries(source.sparql_server.headers).map(([key, value]) => ({ key, value })),
        },
    };
}

function fromFormData(source: SourceFormData): ServerSource {
    return {
        ...source,
        sparql_server: {
            ...source.sparql_server,
            headers: Object.fromEntries(source.sparql_server.headers.map(({ key, value }) => [key, value])),
        },
    };
}

type SourceEditionState = { modal: boolean; sourceForm: SourceFormData };

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

export type Msg_ =
    | { type: Type.UserClickedModal; payload: boolean }
    | { type: Type.UserUpdatedField; payload: { fieldname: string; newValue: string | string[] } }
    | { type: Type.ResetSource; payload: Mode }
    | { type: Type.UserAddedGraphUri; payload: string }
    | { type: Type.UserClickedCheckBox; payload: { checkboxName: string; value: boolean } }
    | { type: Type.UserUpdatedPredicates; payload: { broaderPredicate: string; lang: string } }
    | { type: Type.UserClickedAddDataSource; payload: boolean }
    | {
          type: Type.UserUpdatedDataSource;
          payload: { type: string; table_schema: string; connection: string; dbName: string; local_dictionary: { table: string; labelColumn: string; idColumn: string } | null };
      }
    | { type: Type.UserUpdatedsparql_server; payload: { url: string; method: string; headers: { key: string; value: string }[] } };

const updateSource = (sourceEditionState: SourceEditionState, msg: Msg_): SourceEditionState => {
    const { model } = useModel();
    const unwrappedSources = SRD.unwrap([], identity, model.sources);
    const getUnmodifiedSources: SourceFormData = unwrappedSources.reduce((acc, value) => (sourceEditionState.sourceForm.id === value.id ? toFormData(value) : acc), toFormData(defaultSource(ulid())));
    const resetSourceForm = msg.payload ? sourceEditionState.sourceForm : getUnmodifiedSources;
    const fieldToUpdate = msg.type === Type.UserUpdatedField ? msg.payload.fieldname : "";
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
                    dataSource: msg.payload ? { type: "", table_schema: "", connection: "", dbName: "", local_dictionary: { table: "", labelColumn: "", idColumn: "" } } : null,
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
                    return { ...sourceEditionState, sourceForm: toFormData(defaultSource(ulid())) };

                case Mode.Edition:
                    return { ...sourceEditionState, sourceForm: msg.payload ? sourceEditionState.sourceForm : resetSourceForm };
            }
    }
};

type SourceFormProps = {
    me: string;
    source?: ServerSource;
    create?: boolean;
};

const SourceForm = ({ source = defaultSource(ulid()), create = false, me = "" }: SourceFormProps) => {
    const { model, updateModel } = useModel();
    const unwrappedSources = SRD.unwrap([], identity, model.sources);
    const sources = useMemo(() => unwrappedSources, [unwrappedSources]);

    const [sourceModel, update] = useReducer(updateSource, { modal: false, sourceForm: toFormData(source) });
    const [issues, setIssues] = useState<ZodCustomIssueWithMessage[]>([]);
    const schemaTypes = [...new Set(sources.map((source) => source.schemaType))];

    const inputSourceSchema = create ? InputSourceSchemaCreate : InputSourceSchema;
    const zo = useZorm("source-form", inputSourceSchema, { setupListeners: false, customIssues: issues });

    const [isAfterSubmission, setIsAfterSubmission] = useState<boolean>(false);
    const handleOpen = () => update({ type: Type.UserClickedModal, payload: true });
    const handleClose = () => update({ type: Type.UserClickedModal, payload: false });
    const handleFieldUpdate = (fieldname: string) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string | string[]>) => {
        update({ type: Type.UserUpdatedField, payload: { fieldname: fieldname, newValue: event.target.value } });
    };
    const handleGroupUpdate = (value: string) => {
        update({ type: Type.UserUpdatedField, payload: { fieldname: "group", newValue: value } });
    };

    const handleTaxonomyPredicatesUpdate = (value: string[]) => {
        update({ type: Type.UserUpdatedField, payload: { fieldname: "taxonomyPredicates", newValue: value } });
    };

    const _handleFieldUpdate = (event: ChangeEvent<HTMLInputElement>) => update({ type: Type.UserAddedGraphUri, payload: event.target.value });

    useEffect(() => {
        if (sourceModel.sourceForm.owner.length == 0 && me !== "") {
            update({ type: Type.UserUpdatedField, payload: { fieldname: "owner", newValue: me } });
        }
    }, [sourceModel.sourceForm.owner]);

    const handleSparql_serverUpdate = (fieldName: string) => (event: ChangeEvent<HTMLTextAreaElement>) => {
        update({
            type: Type.UserUpdatedsparql_server,
            payload: { ...sourceModel.sourceForm.sparql_server, [fieldName]: fieldName === "headers" ? [] : event.target.value },
        });
    };

    const handleSparql_serverHeadersUpdate = (updater: (previousHeaders: SparqlServerHeadersFormData) => SparqlServerHeadersFormData) => {
        update({
            type: Type.UserUpdatedsparql_server,
            payload: { ...sourceModel.sourceForm.sparql_server, headers: updater(sourceModel.sourceForm.sparql_server.headers) },
        });
    };

    const addHeader = () => {
        handleSparql_serverHeadersUpdate((prevHeaders) => [...prevHeaders, { key: "", value: "" }]);
    };

    const removeHeader = (idx: number) => {
        handleSparql_serverHeadersUpdate((prevHeaders) => {
            const newHeaders = [...prevHeaders];
            newHeaders.splice(idx, 1);
            return newHeaders;
        });
    };

    const updateHeaderKey = (idx: number) => (event: ChangeEvent<HTMLInputElement>) =>
        handleSparql_serverHeadersUpdate((prevHeaders) => {
            const newHeaders = [...prevHeaders];
            newHeaders[idx] = { ...prevHeaders[idx], key: event.currentTarget.value };
            return newHeaders;
        });

    const updateHeaderValue = (idx: number) => (event: ChangeEvent<HTMLInputElement>) =>
        handleSparql_serverHeadersUpdate((prevHeaders) => {
            const newHeaders = [...prevHeaders];
            newHeaders[idx] = { ...prevHeaders[idx], value: event.currentTarget.value };
            return newHeaders;
        });

    const handleCheckbox = (checkboxName: string) => (event: ChangeEvent<HTMLInputElement>) =>
        update({ type: Type.UserClickedCheckBox, payload: { checkboxName: checkboxName, value: event.target.checked } });

    const knownGroup = [...new Set(sources.flatMap((source) => source.group))].filter((group) => group.length > 0);
    const knownTaxonomyPredicates = [...new Set(sources.flatMap((source) => source.taxonomyPredicates))];

    function validateSourceGroup(source: SourceFormData) {
        const issues = createCustomIssues(InputSourceSchemaCreate);
        if (source.group.startsWith("PRIVATE/") && source.published) {
            issues.group("Published source can't be in PRIVATE group");
        }
        return {
            issues: issues.toArray(),
        };
    }

    function validateSourceName(sourceName: string) {
        const issues = createCustomIssues(InputSourceSchemaCreate);

        if (sources.reduce((acc, s) => (acc ||= s.id === sourceName), false)) {
            issues.name(`Source's name ${sourceName} is already in use`);
        }

        return {
            issues: issues.toArray(),
        };
    }
    const saveSources = () => {
        void saveSource(fromFormData(sourceModel.sourceForm), create ? Mode.Creation : Mode.Edition, updateModel, update);
        const mode = create ? "create" : "edit";
        void writeLog(me, "ConfigEditor", mode, sourceModel.sourceForm.name);
    };
    const createIssues = (issue: ZodCustomIssueWithMessage[]) => setIssues(issue);
    const validateAfterSubmission = () => {
        if (isAfterSubmission) {
            zo.validate();
        }
    };

    const users = SRD.unwrap([], (a) => a, model.users);

    return (
        <>
            {create ? (
                <Button variant="contained" color="primary" onClick={handleOpen}>
                    Create Source
                </Button>
            ) : (
                <IconButton color="primary" onClick={handleOpen} title={"Edit"}>
                    <Edit />
                </IconButton>
            )}
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
                        <Grid item>
                            <Grid alignItems="center" container wrap="nowrap">
                                <Grid item flex={1}>
                                    <FormControlLabel control={<Checkbox checked={sourceModel.sourceForm.editable} onChange={handleCheckbox("editable")} />} label="Editable?" />
                                </Grid>
                                <Grid item>
                                    <HelpButton title="Editable" message={sourceHelp.editable} />
                                </Grid>
                            </Grid>
                        </Grid>
                        <Grid item>
                            <Grid alignItems="center" container wrap="nowrap">
                                <Grid item flex={1}>
                                    <FormControlLabel control={<Checkbox checked={sourceModel.sourceForm.isDraft} onChange={handleCheckbox("isDraft")} />} label="Draft?" />
                                </Grid>
                                <Grid item>
                                    <HelpButton title="isDraft" message={sourceHelp.isDraft} />
                                </Grid>
                            </Grid>
                        </Grid>
                        <Grid item>
                            <Grid alignItems="center" container wrap="nowrap">
                                <Grid item flex={1}>
                                    <FormControlLabel
                                        control={<Checkbox checked={sourceModel.sourceForm.allowIndividuals} onChange={handleCheckbox("allowIndividuals")} />}
                                        label="Allow individuals?"
                                    />
                                </Grid>
                                <Grid item>
                                    <HelpButton title="allowIndividuals" message={sourceHelp.allowIndividuals} />
                                </Grid>
                            </Grid>
                        </Grid>
                        <Grid item>
                            <Grid alignItems="center" container wrap="nowrap">
                                <Grid item flex={1}>
                                    <FormControlLabel
                                        onBlur={() => {
                                            const res = validateSourceGroup(sourceModel.sourceForm);
                                            createIssues(res.issues);
                                            validateAfterSubmission();
                                        }}
                                        control={<Checkbox checked={sourceModel.sourceForm.published} onChange={handleCheckbox("published")} />}
                                        label="Published?"
                                    />
                                </Grid>
                                <Grid item>
                                    <HelpButton title="published" message={sourceHelp.published} />
                                </Grid>
                            </Grid>
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                name={
                                    // @ts-expect-error FIXME
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
                                    zo.fields.name()
                                }
                                helperText={
                                    // @ts-expect-error FIXME
                                    errorMessage(zo.errors.name)
                                }
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
                                disabled={!create}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <HelpButton title="Name" message={sourceHelp.name} />
                                        </InputAdornment>
                                    ),
                                }}
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
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <HelpButton title="Graph' Uris" message={sourceHelp.graphUri} />
                                        </InputAdornment>
                                    ),
                                }}
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
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <HelpButton title="Sparql server method" message={sourceHelp.sparql_server.method} />
                                        </InputAdornment>
                                    ),
                                }}
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
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <HelpButton title="Sparql server url" message={sourceHelp.sparql_server.url} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid container item xs={6}>
                            {sourceModel.sourceForm.sparql_server.headers.map((header, headerIdx) => (
                                <Fragment key={headerIdx}>
                                    <Grid container spacing={4}>
                                        <Grid item xs={6}>
                                            <TextField
                                                fullWidth
                                                onChange={updateHeaderKey(headerIdx)}
                                                value={header.key}
                                                id={`sparql_server_headers`}
                                                label={"Header key"}
                                                variant="standard"
                                                InputProps={{
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <HelpButton title="Header key" message={sourceHelp.sparql_server.headers.key} />
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <TextField
                                                fullWidth
                                                onChange={updateHeaderValue(headerIdx)}
                                                value={header.value}
                                                id={`sparql_server_headers`}
                                                label={"Header value"}
                                                variant="standard"
                                                InputProps={{
                                                    endAdornment: (
                                                        <>
                                                            <InputAdornment position="end">
                                                                <HelpButton title="Header value" message={sourceHelp.sparql_server.headers.value} />
                                                            </InputAdornment>
                                                            <InputAdornment position="end">
                                                                <IconButton color="secondary" onClick={() => removeHeader(headerIdx)}>
                                                                    <Remove />
                                                                </IconButton>
                                                            </InputAdornment>
                                                        </>
                                                    ),
                                                }}
                                            />
                                        </Grid>
                                    </Grid>
                                </Fragment>
                            ))}
                            <Button onClick={addHeader} startIcon={<Add />}>
                                Add header
                            </Button>
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
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <HelpButton title="Top Class filter" message={sourceHelp.topClassFilter} />
                                        </InputAdornment>
                                    ),
                                }}
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
                                    endAdornment={
                                        <InputAdornment position="end">
                                            <HelpButton title="Controller" message={sourceHelp.controller} />
                                        </InputAdornment>
                                    }
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
                            <FormControl>
                                <InputLabel id="owner">owner</InputLabel>
                                <Select
                                    labelId="owner"
                                    id="owner-select"
                                    value={sourceModel.sourceForm.owner}
                                    label="select-owner"
                                    fullWidth
                                    style={{ width: "400px" }}
                                    renderValue={(selected: string | string[]) => (typeof selected === "string" ? selected : selected.join(", "))}
                                    onChange={handleFieldUpdate("owner")}
                                    endAdornment={
                                        <InputAdornment position="end">
                                            <HelpButton title="owner" message={sourceHelp.owner} />
                                        </InputAdornment>
                                    }
                                >
                                    {users.map((user) => (
                                        <MenuItem key={user.id} value={user.login}>
                                            {user.login}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <Autocomplete
                                freeSolo
                                disableClearable
                                options={knownGroup}
                                onInputChange={(_e, newValue) => handleGroupUpdate(newValue)}
                                onBlur={() => {
                                    const res = validateSourceGroup(sourceModel.sourceForm);
                                    createIssues(res.issues);
                                    validateAfterSubmission();
                                }}
                                inputValue={sourceModel.sourceForm.group}
                                id="group"
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        helperText={errorMessage(zo.errors.group)}
                                        label="Group"
                                        InputProps={{
                                            ...params.InputProps,
                                            type: "search",
                                            name: zo.fields.group(),
                                        }}
                                    />
                                )}
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
                                    endAdornment={
                                        <InputAdornment position="end">
                                            <HelpButton title="Imports" message={sourceHelp.imports} />
                                        </InputAdornment>
                                    }
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
                                    onChange={(_, value) => handleTaxonomyPredicatesUpdate(value)}
                                    style={{ width: "400px" }}
                                    renderInput={(params) => {
                                        if (sourceModel.sourceForm.taxonomyPredicates.length === 0) {
                                            const endAdornment = (
                                                <InputAdornment position="end">
                                                    <HelpButton title="Taxonomy predicates" message={sourceHelp.taxonomyPredicates} />
                                                </InputAdornment>
                                            );
                                            const newInputProps = { ...params.InputProps, endAdornment: endAdornment };
                                            params.InputProps = newInputProps;
                                        }
                                        return <TextField {...params} variant="filled" label="Taxonomy Predicates" />;
                                    }}
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
                                    endAdornment={
                                        <InputAdornment position="end">
                                            <HelpButton title="Schema type" message={sourceHelp.schemaType} />
                                        </InputAdornment>
                                    }
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

const FormGivenSchemaType = (props: { model: SourceEditionState; update: Dispatch<Msg_> }) => {
    const handlePredicateUpdate = (fieldName: string) => (event: ChangeEvent<HTMLTextAreaElement>) =>
        props.update({ type: Type.UserUpdatedPredicates, payload: { ...props.model.sourceForm.predicates, [fieldName]: event.target.value } });
    const handleDataSourceUpdate = (fieldName: string) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string | string[]>) =>
        props.update({
            type: Type.UserUpdatedDataSource,
            payload: props.model.sourceForm.dataSource
                ? { ...props.model.sourceForm.dataSource, [fieldName]: event.target.value }
                : { type: "", table_schema: "string", connection: "string", dbName: "string", local_dictionary: { table: "string", labelColumn: "string", idColumn: "string" } },
        });

    const handleAddDataSource = (event: ChangeEvent<HTMLInputElement>) => props.update({ type: Type.UserClickedAddDataSource, payload: event.target.checked });
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
                            <InputLabel id="dataSource-type">DataSource&apos;s type</InputLabel>
                            <Select
                                labelId="dataSource-type"
                                id="dataSource"
                                value={props.model.sourceForm.dataSource ? props.model.sourceForm.dataSource.type : ""}
                                label="Data source's type"
                                fullWidth
                                multiple
                                style={{ width: "400px" }}
                                // renderValue={selected}
                                // renderValue={(selected: string | string) => (typeof selected === "string" ? selected : selected.join(", "))}
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
export { SourcesTable, Type, Mode };
