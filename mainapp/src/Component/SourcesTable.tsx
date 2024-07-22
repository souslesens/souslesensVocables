import * as Mui from "@mui/material";
import * as MuiColors from "@mui/material/colors";
import * as MuiIcons from "@mui/icons-material";
import * as React from "react";
import * as z from "zod";

import CsvDownloader from "react-csv-downloader";
import { Datas } from "react-csv-downloader/dist/esm/lib/csv";
import { useZorm, createCustomIssues } from "react-zorm";
import { ZodCustomIssueWithMessage } from "react-zorm/dist/types";
import { SRD } from "srd";
import { ulid } from "ulid";

import { useModel } from "../Admin";
import { ServerSource, saveSource, defaultSource, deleteSource, sourceHelp, InputSourceSchema, InputSourceSchemaCreate, getGraphSize } from "../Source";
import { writeLog } from "../Log";
import { identity, style, joinWhenArray, humanizeSize } from "../Utils";
import { HelpButton } from "./HelpModal";
import { ButtonWithConfirmation } from "./ButtonWithConfirmation";
import { errorMessage } from "./errorMessage";

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

    const me = SRD.withDefault("", model.me);
    const indices = SRD.withDefault(null, model.indices);
    const graphs = SRD.withDefault(null, model.graphs);

    const handleDeleteSource = async (source: ServerSource, updateModel) => {
        deleteSource(source, updateModel);
        writeLog(me, "ConfigEditor", "delete", source.name);
    };

    const renderSources = SRD.match(
        {
            notAsked: () => <p>Let&apos;s fetch some data!</p>,
            loading: () => (
                <Mui.Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <Mui.CircularProgress />
                </Mui.Box>
            ),
            failure: (msg: string) => (
                <Mui.Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <p>{`I stumbled into this error when I tried to fetch data: ${msg}. Please, reload this page.`}</p>
                </Mui.Box>
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
                    if (orderBy == "graphSize") {
                        const left_n: number = getGraphSize(a, graphs);
                        const right_n: number = getGraphSize(b, graphs);
                        return order === "asc" ? right_n > left_n : left_n > right_n;
                    } else {
                        const left: string = a[orderBy] || ("" as string);
                        const right: string = b[orderBy] || ("" as string);
                        return order === "asc" ? left.localeCompare(right) : right.localeCompare(left);
                    }
                });

                return (
                    <Mui.Stack direction="column" spacing={{ xs: 2 }} sx={{ m: 4 }} useFlexGap>
                        <Mui.Autocomplete
                            disablePortal
                            id="search-sources"
                            options={gotSources.map((source) => source.name)}
                            onInputChange={(event, newInputValue) => {
                                setFilteringChars(newInputValue);
                            }}
                            renderInput={(params) => <Mui.TextField {...params} label="Search Sources by name" />}
                        />
                        <Mui.TableContainer sx={{ height: "400px" }} component={Mui.Paper}>
                            <Mui.Table stickyHeader>
                                <Mui.TableHead>
                                    <Mui.TableRow>
                                        <Mui.TableCell style={{ fontWeight: "bold" }}>
                                            <Mui.TableSortLabel active={orderBy === "name"} direction={order} onClick={() => handleRequestSort("name")}>
                                                Name
                                            </Mui.TableSortLabel>
                                        </Mui.TableCell>
                                        <Mui.TableCell style={{ fontWeight: "bold", width: "100%" }}>
                                            <Mui.TableSortLabel active={orderBy === "graphUri"} direction={order} onClick={() => handleRequestSort("graphUri")}>
                                                Graph URI
                                            </Mui.TableSortLabel>
                                        </Mui.TableCell>
                                        <Mui.TableCell align="center" style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                                            <Mui.TableSortLabel active={orderBy === "graphSize"} direction={order} onClick={() => handleRequestSort("graphSize")}>
                                                Graph size
                                            </Mui.TableSortLabel>
                                        </Mui.TableCell>
                                        <Mui.TableCell align="center" style={{ fontWeight: "bold" }}>
                                            <Mui.TableSortLabel active={orderBy === "group"} direction={order} onClick={() => handleRequestSort("group")}>
                                                Group
                                            </Mui.TableSortLabel>
                                        </Mui.TableCell>
                                        <Mui.TableCell align="center" style={{ fontWeight: "bold" }}>
                                            Data
                                        </Mui.TableCell>
                                        <Mui.TableCell align="center" style={{ fontWeight: "bold" }}>
                                            Actions
                                        </Mui.TableCell>
                                    </Mui.TableRow>
                                </Mui.TableHead>
                                <Mui.TableBody sx={{ width: "100%", overflow: "visible" }}>
                                    {sortedSources
                                        .filter((source) => source.name.includes(filteringChars))
                                        .map((source) => {
                                            const haveIndices = indices ? indices.includes(source.name.toLowerCase()) : false;
                                            const graphInfo = graphs.find((g) => g.name === source.graphUri);
                                            const haveGraphs = graphInfo !== undefined;

                                            return (
                                                <Mui.TableRow key={source.name}>
                                                    <Mui.TableCell>{source.name}</Mui.TableCell>
                                                    <Mui.TableCell>
                                                        <Mui.Link href={source.graphUri}>{source.graphUri}</Mui.Link>
                                                    </Mui.TableCell>
                                                    <Mui.TableCell align="center">{humanizeSize(getGraphSize(source, graphs))}</Mui.TableCell>
                                                    <Mui.TableCell align="center">{source.group ? <Mui.Chip label={source.group} size="small" /> : ""}</Mui.TableCell>
                                                    <Mui.TableCell align="center">
                                                        <Mui.Stack direction="row" justifyContent="center" useFlexGap>
                                                            <Mui.Tooltip title="RDF Graph">
                                                                <MuiIcons.Circle sx={{ color: graphs !== null ? (haveGraphs ? MuiColors.green[500] : MuiColors.pink[500]) : MuiColors.grey[500] }} />
                                                            </Mui.Tooltip>
                                                            <Mui.Tooltip title="ElasticSearch indices">
                                                                <MuiIcons.Circle sx={{ color: indices !== null ? (haveIndices ? MuiColors.green[500] : MuiColors.pink[500]) : MuiColors.grey[500] }} />
                                                            </Mui.Tooltip>
                                                        </Mui.Stack>
                                                    </Mui.TableCell>
                                                    <Mui.TableCell align="center">
                                                        <Mui.Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                            <SourceForm source={source} me={me} />
                                                            <ButtonWithConfirmation label="Delete" msg={() => handleDeleteSource(source, updateModel)} />
                                                        </Mui.Stack>
                                                    </Mui.TableCell>
                                                </Mui.TableRow>
                                            );
                                        })}
                                </Mui.TableBody>
                            </Mui.Table>
                        </Mui.TableContainer>
                        <Mui.Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                            <CsvDownloader separator="&#9;" filename="sources" extension=".tsv" datas={datas as Datas}>
                                <Mui.Button variant="outlined">Download CSV</Mui.Button>
                            </CsvDownloader>
                            <SourceForm create={true} me={me} />
                        </Mui.Stack>
                    </Mui.Stack>
                );
            },
        },
        model.sources
    );

    return renderSources;
};

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
          payload: { type: string; table_schema: string; connection: string; dbName: string; local_dictionary: { table: string; labelColumn: string; idColumn: string } | null };
      }
    | { type: Type.UserUpdatedsparql_server; payload: { url: string; method: string; headers: { key: string; value: string }[] } };

const updateSource = (sourceEditionState: SourceEditionState, msg: Msg_): SourceEditionState => {
    const { model } = useModel();
    const unwrappedSources = SRD.unwrap([], identity, model.sources);
    const getUnmodifiedSources: SourceFormData = unwrappedSources.reduce((acc, value) => (sourceEditionState.sourceForm.id === value.id ? toFormData(value) : acc), toFormData(defaultSource(ulid())));
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
    const sources = React.useMemo(() => unwrappedSources, [unwrappedSources]);

    const [sourceModel, update] = React.useReducer(updateSource, { modal: false, sourceForm: toFormData(source) });
    const [issues, setIssues] = React.useState<ZodCustomIssueWithMessage[]>([]);
    const schemaTypes = [...new Set(sources.map((source) => source.schemaType))];

    const inputSourceSchema = create ? InputSourceSchemaCreate : InputSourceSchema;
    const zo = useZorm("source-form", z.object(inputSourceSchema), { setupListeners: false, customIssues: issues });

    const [isAfterSubmission, setIsAfterSubmission] = React.useState<boolean>(false);
    const handleOpen = () => update({ type: Type.UserClickedModal, payload: true });
    const handleClose = () => update({ type: Type.UserClickedModal, payload: false });
    const handleFieldUpdate = (fieldname: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        update({ type: Type.UserUpdatedField, payload: { fieldname: fieldname, newValue: event.target.value } });
    };
    const handleGroupUpdate = (value: string) => {
        update({ type: Type.UserUpdatedField, payload: { fieldname: "group", newValue: value } });
    };

    const handleTaxonomyPredicatesUpdate = (value: string[]) => {
        update({ type: Type.UserUpdatedField, payload: { fieldname: "taxonomyPredicates", newValue: value } });
    };

    const _handleFieldUpdate = (event: React.ChangeEvent<HTMLInputElement>) => update({ type: Type.UserAddedGraphUri, payload: event.target.value });

    React.useEffect(() => {
        if (sourceModel.sourceForm.owner.length == 0 && me !== "") {
            update({ type: Type.UserUpdatedField, payload: { fieldname: "owner", newValue: me } });
        }
    }, [sourceModel.sourceForm.owner]
    )

    const handleSparql_serverUpdate = (fieldName: string) => (event: React.ChangeEvent<HTMLTextAreaElement>) => {
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

    const updateHeaderKey = (idx: number) => (event: React.ChangeEvent<HTMLInputElement>) =>
        handleSparql_serverHeadersUpdate((prevHeaders) => {
            const newHeaders = [...prevHeaders];
            newHeaders[idx] = { ...prevHeaders[idx], key: event.currentTarget.value };
            return newHeaders;
        });

    const updateHeaderValue = (idx: number) => (event: React.ChangeEvent<HTMLInputElement>) =>
        handleSparql_serverHeadersUpdate((prevHeaders) => {
            const newHeaders = [...prevHeaders];
            newHeaders[idx] = { ...prevHeaders[idx], value: event.currentTarget.value };
            return newHeaders;
        });

    const handleCheckbox = (checkboxName: string) => (event: React.ChangeEvent<HTMLInputElement>) =>
        update({ type: Type.UserClickedCheckBox, payload: { checkboxName: checkboxName, value: event.target.checked } });

    const knownGroup = [...new Set(sources.flatMap((source) => source.group))].filter((group) => group.length > 0);
    const knownTaxonomyPredicates = [...new Set(sources.flatMap((source) => source.taxonomyPredicates))];

    function validateSourceGroup(source: ServerSource) {
        const issues = createCustomIssues(InputSourceSchema);
        if (source.group.startsWith("PRIVATE/") && source.published) {
            issues.group("Published source can't be in PRIVATE group");
        }
        return {
            issues: issues.toArray(),
        };
    }

    function validateSourceName(sourceName: string) {
        const issues = createCustomIssues(InputSourceSchema);

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
        writeLog(me, "ConfigEditor", mode, sourceModel.sourceForm.name);
    };
    const createIssues = (issue: ZodCustomIssueWithMessage[]) => setIssues(issue);
    const validateAfterSubmission = () => {
        if (isAfterSubmission) {
            zo.validate();
        }
    };
    return (
        <>
            <Mui.Button color="primary" variant="contained" onClick={handleOpen}>
                {create ? "Create Source" : "Edit"}
            </Mui.Button>
            <Mui.Modal onClose={handleClose} open={sourceModel.modal}>
                <Mui.Box
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
                    <Mui.Grid container spacing={4}>
                        <Mui.Grid item>
                            <Mui.Grid alignItems="center" container wrap="nowrap">
                                <Mui.Grid item flex={1}>
                                    <Mui.FormControlLabel control={<Mui.Checkbox checked={sourceModel.sourceForm.editable} onChange={handleCheckbox("editable")} />} label="Editable?" />
                                </Mui.Grid>
                                <Mui.Grid item>
                                    <HelpButton title="Editable" message={sourceHelp.editable} />
                                </Mui.Grid>
                            </Mui.Grid>
                        </Mui.Grid>
                        <Mui.Grid item>
                            <Mui.Grid alignItems="center" container wrap="nowrap">
                                <Mui.Grid item flex={1}>
                                    <Mui.FormControlLabel control={<Mui.Checkbox checked={sourceModel.sourceForm.isDraft} onChange={handleCheckbox("isDraft")} />} label="Draft?" />
                                </Mui.Grid>
                                <Mui.Grid item>
                                    <HelpButton title="isDraft" message={sourceHelp.isDraft} />
                                </Mui.Grid>
                            </Mui.Grid>
                        </Mui.Grid>
                        <Mui.Grid item>
                            <Mui.Grid alignItems="center" container wrap="nowrap">
                                <Mui.Grid item flex={1}>
                                    <Mui.FormControlLabel
                                        control={<Mui.Checkbox checked={sourceModel.sourceForm.allowIndividuals} onChange={handleCheckbox("allowIndividuals")} />}
                                        label="Allow individuals?"
                                    />
                                </Mui.Grid>
                                <Mui.Grid item>
                                    <HelpButton title="allowIndividuals" message={sourceHelp.allowIndividuals} />
                                </Mui.Grid>
                            </Mui.Grid>
                        </Mui.Grid>
                        <Mui.Grid item>
                            <Mui.Grid alignItems="center" container wrap="nowrap">
                                <Mui.Grid item flex={1}>
                                    <Mui.FormControlLabel
                                        onBlur={() => {
                                            const res = validateSourceGroup(sourceModel.sourceForm);
                                            createIssues(res.issues);
                                            validateAfterSubmission();
                                        }}
                                        control={<Mui.Checkbox checked={sourceModel.sourceForm.published} onChange={handleCheckbox("published")} />}
                                        label="Published?"
                                    />
                                </Mui.Grid>
                                <Mui.Grid item>
                                    <HelpButton title="published" message={sourceHelp.published} />
                                </Mui.Grid>
                            </Mui.Grid>
                        </Mui.Grid>
                        <Mui.Grid item xs={6}>
                            <Mui.TextField
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
                                disabled={!create}
                                InputProps={{
                                    endAdornment: (
                                        <Mui.InputAdornment position="end">
                                            <HelpButton title="Name" message={sourceHelp.name} />
                                        </Mui.InputAdornment>
                                    ),
                                }}
                            />
                        </Mui.Grid>
                        <Mui.Grid item xs={6}>
                            <Mui.TextField
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
                                        <Mui.InputAdornment position="end">
                                            <HelpButton title="Graph' Uris" message={sourceHelp.graphUri} />
                                        </Mui.InputAdornment>
                                    ),
                                }}
                            />
                        </Mui.Grid>
                        <Mui.Grid item xs={6}>
                            <Mui.TextField
                                fullWidth
                                onChange={handleSparql_serverUpdate("method")}
                                value={sourceModel.sourceForm.sparql_server.method}
                                id={`sparql_server_Method`}
                                label={"Sparql server method"}
                                variant="standard"
                                InputProps={{
                                    endAdornment: (
                                        <Mui.InputAdornment position="end">
                                            <HelpButton title="Sparql server method" message={sourceHelp.sparql_server.method} />
                                        </Mui.InputAdornment>
                                    ),
                                }}
                            />
                        </Mui.Grid>
                        <Mui.Grid item xs={6}>
                            <Mui.TextField
                                fullWidth
                                onChange={handleSparql_serverUpdate("url")}
                                value={sourceModel.sourceForm.sparql_server.url}
                                id={`sparql_server_url`}
                                label={"Sparql server url"}
                                variant="standard"
                                InputProps={{
                                    endAdornment: (
                                        <Mui.InputAdornment position="end">
                                            <HelpButton title="Sparql server url" message={sourceHelp.sparql_server.url} />
                                        </Mui.InputAdornment>
                                    ),
                                }}
                            />
                        </Mui.Grid>
                        <Mui.Grid container item xs={6}>
                            {sourceModel.sourceForm.sparql_server.headers.map((header, headerIdx) => (
                                <React.Fragment key={headerIdx}>
                                    <Mui.Grid container spacing={4}>
                                        <Mui.Grid item xs={6}>
                                            <TextField
                                                fullWidth
                                                onChange={updateHeaderKey(headerIdx)}
                                                value={header.key}
                                                id={`sparql_server_headers`}
                                                label={"Header key"}
                                                variant="standard"
                                                InputProps={{
                                                    endAdornment: (
                                                        <Mui.InputAdornment position="end">
                                                            <HelpButton title="Header key" message={sourceHelp.sparql_server.headers.key} />
                                                        </Mui.InputAdornment>
                                                    ),
                                                }}
                                            />
                                        </Mui.Grid>
                                        <Mui.Grid item xs={6}>
                                            <Mui.TextField
                                                fullWidth
                                                onChange={updateHeaderValue(headerIdx)}
                                                value={header.value}
                                                id={`sparql_server_headers`}
                                                label={"Header value"}
                                                variant="standard"
                                                InputProps={{
                                                    endAdornment: (
                                                        <>
                                                            <Mui.InputAdornment position="end">
                                                                <HelpButton title="Header value" message={sourceHelp.sparql_server.headers.value} />
                                                            </Mui.InputAdornment>
                                                            <Mui.InputAdornment position="end">
                                                                <Mui.IconButton color="secondary" onClick={() => removeHeader(headerIdx)}>
                                                                    <MuiIcons.Remove />
                                                                </Mui.IconButton>
                                                            </Mui.InputAdornment>
                                                        </>
                                                    ),
                                                }}
                                            />
                                        </Mui.Grid>
                                    </Mui.Grid>
                                </React.Fragment>
                            ))}
                            <Mui.Button onClick={addHeader} startIcon={<MuiIcons.Add />}>
                                Add header
                            </Mui.Button>
                        </Mui.Grid>
                        <Mui.Grid item xs={6}>
                            <Mui.TextField
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
                                        <Mui.InputAdornment position="end">
                                            <HelpButton title="Top Class filter" message={sourceHelp.topClassFilter} />
                                        </Mui.InputAdornment>
                                    ),
                                }}
                            />
                        </Mui.Grid>

                        <Mui.Grid item xs={6}>
                            <Mui.FormControl>
                                <Mui.InputLabel id="controller">Controller</Mui.InputLabel>
                                <Mui.Select
                                    labelId="controller"
                                    id="controller-select"
                                    value={sourceModel.sourceForm.controller}
                                    label="select-controller"
                                    fullWidth
                                    style={{ width: "400px" }}
                                    renderValue={(selected: string | string[]) => (typeof selected === "string" ? selected : selected.join(", "))}
                                    onChange={handleFieldUpdate("controller")}
                                    endAdornment={
                                        <Mui.InputAdornment position="end">
                                            <HelpButton title="Controller" message={sourceHelp.controller} />
                                        </Mui.InputAdornment>
                                    }
                                >
                                    {["Sparql_OWL", "Sparql_SKOS", "Sparql_INDIVIDUALS"].map((schemaType) => (
                                        <Mui.MenuItem key={schemaType} value={schemaType}>
                                            {schemaType}
                                        </Mui.MenuItem>
                                    ))}
                                </Mui.Select>
                            </Mui.FormControl>
                        </Mui.Grid>
                        <Mui.Grid item xs={6}>
                            <Mui.FormControl>
                                <Mui.InputLabel id="owner">owner</Mui.InputLabel>
                                <Mui.Select
                                    labelId="owner"
                                    id="owner-select"
                                    value={sourceModel.sourceForm.owner}
                                    label="select-owner"
                                    fullWidth
                                    style={{ width: "400px" }}
                                    renderValue={(selected: string | string[]) => (typeof selected === "string" ? selected : selected.join(", "))}
                                    onChange={handleFieldUpdate("owner")}
                                    endAdornment={
                                        <Mui.InputAdornment position="end">
                                            <HelpButton title="owner" message={sourceHelp.owner} />
                                        </Mui.InputAdornment>
                                    }
                                >
                                    {model.users.data.map((user) => (
                                        <Mui.MenuItem key={user.id} value={user.login}>
                                            {user.login}
                                        </Mui.MenuItem>
                                    ))}
                                </Mui.Select>
                            </Mui.FormControl>
                        </Mui.Grid>
                        <Mui.Grid item xs={6}>
                            <Mui.Autocomplete
                                freeSolo
                                disableClearable
                                options={knownGroup}
                                label={"Group"}
                                onInputChange={(_e, newValue) => handleGroupUpdate(newValue)}
                                onBlur={() => {
                                    const res = validateSourceGroup(sourceModel.sourceForm);
                                    createIssues(res.issues);
                                    validateAfterSubmission();
                                }}
                                inputValue={sourceModel.sourceForm.group}
                                id="group"
                                renderInput={(params) => (
                                    <Mui.TextField
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
                        </Mui.Grid>

                        <Mui.Grid item xs={6}>
                            <Mui.FormControl>
                                <Mui.InputLabel id="imports-label">Imports</Mui.InputLabel>
                                <Mui.Select
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
                                        <Mui.InputAdornment position="end">
                                            <HelpButton title="Imports" message={sourceHelp.imports} />
                                        </Mui.InputAdornment>
                                    }
                                >
                                    {sources.map((source) => (
                                        <Mui.MenuItem key={source.name} value={source.name}>
                                            <Mui.Checkbox checked={sourceModel.sourceForm.imports.indexOf(source.name) > -1} />
                                            {source.name}
                                        </Mui.MenuItem>
                                    ))}
                                </Mui.Select>
                            </Mui.FormControl>
                        </Mui.Grid>
                        <Mui.Grid item xs={6}>
                            <Mui.FormControl>
                                <Mui.Autocomplete
                                    multiple
                                    limitTags={2}
                                    id="taxonomy-predicates"
                                    options={knownTaxonomyPredicates}
                                    value={sourceModel.sourceForm.taxonomyPredicates}
                                    freeSolo
                                    onChange={(e, value) => handleTaxonomyPredicatesUpdate(value)}
                                    style={{ width: "400px" }}
                                    renderInput={(params) => {
                                        if (sourceModel.sourceForm.taxonomyPredicates.length === 0) {
                                            const endAdornment = (
                                                <Mui.InputAdornment position="end">
                                                    <HelpButton title="Taxonomy predicates" message={sourceHelp.taxonomyPredicates} />
                                                </Mui.InputAdornment>
                                            );
                                            const newInputProps = { ...params.InputProps, endAdornment: endAdornment };
                                            params.InputProps = newInputProps;
                                        }
                                        return <Mui.TextField {...params} variant="filled" label="Taxonomy Predicates" />;
                                    }}
                                />
                            </Mui.FormControl>
                        </Mui.Grid>
                        <Mui.Grid item xs={6}>
                            <Mui.FormControl>
                                <Mui.InputLabel id="schemaType-label">Schema type</Mui.InputLabel>
                                <Mui.Select
                                    labelId="schemaType-label"
                                    id="schemaType"
                                    value={sourceModel.sourceForm.schemaType}
                                    label="select-schemaTyoe-label"
                                    fullWidth
                                    style={{ width: "400px" }}
                                    renderValue={(selected: string | string[]) => (typeof selected === "string" ? selected : selected.join(", "))}
                                    onChange={handleFieldUpdate("schemaType")}
                                    endAdornment={
                                        <Mui.InputAdornment position="end">
                                            <HelpButton title="Schema type" message={sourceHelp.schemaType} />
                                        </Mui.InputAdornment>
                                    }
                                >
                                    {schemaTypes.map((schemaType) => (
                                        <Mui.MenuItem key={schemaType} value={schemaType}>
                                            <Mui.Checkbox checked={sourceModel.sourceForm.schemaType.indexOf(schemaType) > -1} />
                                            {schemaType}
                                        </Mui.MenuItem>
                                    ))}
                                </Mui.Select>
                            </Mui.FormControl>
                        </Mui.Grid>
                        <FormGivenSchemaType update={update} model={sourceModel} />

                        <Mui.Grid item xs={12} style={{ textAlign: "center" }}>
                            <Mui.Button disabled={zo.validation?.success === false || zo.customIssues.length > 0} color="primary" type="submit" variant="contained">
                                Save Source
                            </Mui.Button>
                        </Mui.Grid>
                    </Mui.Grid>
                </Mui.Box>
            </Mui.Modal>
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
                : { type: "", table_schema: "string", connection: "string", dbName: "string", local_dictionary: { table: "string", labelColumn: "string", idColumn: "string" } },
        });

    const handleAddDataSource = (event: React.ChangeEvent<HTMLInputElement>) => props.update({ type: Type.UserClickedAddDataSource, payload: event.target.checked });
    const dataSource = props.model.sourceForm.dataSource;

    switch (props.model.sourceForm.schemaType) {
        case "SKOS":
            return (
                <>
                    <Mui.Grid item xs={6}>
                        <Mui.TextField
                            fullWidth
                            onChange={handlePredicateUpdate("broaderPredicate")}
                            value={props.model.sourceForm.predicates.broaderPredicate}
                            id={`broaderPredicate`}
                            label={"Broader Predicate"}
                            variant="standard"
                        />
                    </Mui.Grid>
                    <Mui.Grid item xs={6}>
                        <Mui.TextField fullWidth onChange={handlePredicateUpdate("lang")} value={props.model.sourceForm.predicates.lang} id={`predicateLang`} label={"Language"} variant="standard" />
                    </Mui.Grid>
                </>
            );
        case "KNOWLEDGE_GRAPH":
            return (
                <>
                    <Mui.Grid item xs={3}>
                        <Mui.FormControlLabel control={<Mui.Checkbox checked={props.model.sourceForm.dataSource ? true : false} onChange={handleAddDataSource} />} label="Do you want to add a data source ?" />
                    </Mui.Grid>

                    <Mui.Grid item xs={6}>
                        <Mui.FormControl>
                            <Mui.InputLabel id="dataSource-type">DataSource&apos;s type</Mui.InputLabel>
                            <Mui.Select
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
                            </Mui.Select>
                        </Mui.FormControl>
                    </Mui.Grid>
                    <Mui.Grid item xs={6}>
                        <Mui.TextField
                            fullWidth
                            onChange={handleDataSourceUpdate("connection")}
                            value={props.model.sourceForm.dataSource ? props.model.sourceForm.dataSource.connection : ""}
                            id={`connection`}
                            label={"Connection"}
                            variant="standard"
                            style={{ display: !dataSource ? "none" : "" }}
                        />
                    </Mui.Grid>
                    <Mui.Grid item xs={6}>
                        <Mui.TextField
                            fullWidth
                            onChange={handleDataSourceUpdate("dbName")}
                            value={props.model.sourceForm.dataSource ? props.model.sourceForm.dataSource.dbName : ""}
                            id={`dbName`}
                            label={"Data Base's Name"}
                            variant="standard"
                            style={{ display: !dataSource ? "none" : "" }}
                        />
                    </Mui.Grid>
                    <Mui.Grid item xs={6}>
                        <Mui.TextField
                            fullWidth
                            onChange={handleDataSourceUpdate("table_schema")}
                            value={props.model.sourceForm.dataSource ? props.model.sourceForm.dataSource.table_schema : ""}
                            id={`table_schema`}
                            label={"Table Schema"}
                            style={{ display: !dataSource ? "none" : "" }}
                            variant="standard"
                        />
                    </Mui.Grid>
                </>
            );
        default:
            return <div></div>;
    }
};
export { SourcesTable, Msg_, Type, Mode };
