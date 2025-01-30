import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Link,
    Paper,
    Stack,
    styled,
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
import { Circle, Download, Edit } from "@mui/icons-material";

import CsvDownloader from "react-csv-downloader";
import { Datas } from "react-csv-downloader/dist/esm/lib/csv";
import { failure, SRD, success } from "srd";

import { useModel } from "../Admin";
import { deleteSource, getGraphSize, saveSource, ServerSource } from "../Source";
import { writeLog } from "../Log";
import { joinWhenArray, humanizeSize, cleanUpText, jsonToDownloadUrl } from "../Utils";
import { ButtonWithConfirmation } from "./ButtonWithConfirmation";
import { SourcesDialog } from "./SourcesDialog";

type OrderBy = "name" | "graphUri" | "graphSize" | "group";

const SourcesTable = () => {
    const { model, updateModel } = useModel();
    const [filteringChars, setFilteringChars] = useState("");
    const [orderBy, setOrderBy] = useState<OrderBy>("name");
    const [order, setOrder] = useState<Order>("asc");

    const [importSrcMsgSeverity, setImportSrcMsgSeverity] = useState<"warning" | "error" | undefined>(undefined);
    const [importSrcMsg, setImportSrcMsg] = useState(new Set());

    const [openModal, setOpenModal] = useState(false);
    const [editModal, setEditModal] = useState(false);
    const [selectedSource, setSelectedSource] = useState<ServerSource | null>(null);

    type Order = "asc" | "desc";

    function handleRequestSort(property: OrderBy) {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    }

    const me = SRD.withDefault("", model.me);
    const indices = SRD.withDefault(null, model.indices);
    const graphs = SRD.withDefault(null, model.graphs);

    const reformatSource = (sources: ServerSource[]) => {
        const mapSources = sources.map((s: ServerSource) => [s.name, s]);
        return Object.fromEntries(mapSources as [string, ServerSource][]);
    };

    const handleDeleteSource = async (source: ServerSource) => {
        const response = await deleteSource(source);
        if (response.status === 200) {
            const receivedSources = response.message as ServerSource[];
            window.Config.sources = reformatSource(receivedSources);
            updateModel({ type: "sources", payload: success(receivedSources) });
            void writeLog(me, "ConfigEditor", "delete", source.name);
        } else {
            updateModel({ type: "sources", payload: failure(response.message as string) });
        }
    };

    const handleUpdateSource = async (source: ServerSource) => {
        const response = await saveSource(source, editModal);
        setOpenModal(false);

        if (response.status === 200) {
            const receivedSources = response.message as ServerSource[];
            window.Config.sources = reformatSource(receivedSources);
            updateModel({ type: "sources", payload: success(receivedSources) });
            void writeLog(me, "ConfigEditor", editModal ? "edit" : "create", source.name);
        } else {
            updateModel({ type: "sources", payload: failure(response.message as string) });
        }
    };

    const handleOpenModal = (source: ServerSource | null = null) => {
        setEditModal(source !== null);
        setSelectedSource(source);
        setOpenModal(true);
    };

    const closeAlert = () => {
        setImportSrcMsgSeverity(undefined);
        setImportSrcMsg(new Set());
    };

    const handleUploadSource = async (sourceFiles: FileList | null) => {
        if (sourceFiles && sourceFiles !== undefined && sourceFiles?.length > 0) {
            const source = JSON.parse(await sourceFiles[0].text()) as ServerSource;
            // check name
            const existingSourcesName: string[] = SRD.withDefault([], model.sources).map((source) => source.name);
            if (existingSourcesName.includes(source.name)) {
                setImportSrcMsgSeverity("error");
                setImportSrcMsg((msg) => new Set(msg).add(`La source ${source.name} existe déjà`));
                return;
            }
            // remove unknown imports
            const imports: string[] = [];
            source.imports.forEach((imp) => {
                if (existingSourcesName.includes(imp)) {
                    imports.push(imp);
                } else {
                    setImportSrcMsgSeverity("warning");
                    setImportSrcMsg((msg) => new Set(msg).add(`L'import ${imp} n'existe pas`));
                }
            });
            source.imports = imports;
            await handleUpdateSource(source);
        }
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
                <Alert variant="filled" severity="error" sx={{ m: 4 }}>
                    {`${msg}. Please, reload this page.`}
                </Alert>
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
                        }),
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
                        {importSrcMsg.size > 0 && (
                            <Alert variant="filled" severity={importSrcMsgSeverity} sx={{ m: 1 }} onClose={closeAlert}>
                                {Array.from(importSrcMsg).map((msg) => (
                                    <>
                                        {msg}
                                        <br />
                                    </>
                                ))}
                            </Alert>
                        )}
                        <TextField
                            inputProps={{ autocomplete: "off" }}
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
                                                                    source.name,
                                                                )}
                                                                download={`source${source.name}.json`}
                                                            >
                                                                <Download />
                                                            </IconButton>
                                                            <IconButton aria-label="edit" color="primary" onClick={() => handleOpenModal(source)} size="small" title={"Edit Repository"}>
                                                                <Edit />
                                                            </IconButton>
                                                            <ButtonWithConfirmation label="Delete" msg={() => handleDeleteSource(source)} />
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
                                    (model.sources as unknown as Record<string, ServerSource[]>)["data"],
                                )}
                                download={"sources.json"}
                            >
                                Download JSON
                            </Button>
                            <CsvDownloader separator="&#9;" filename="sources" extension=".tsv" datas={datas as Datas}>
                                <Button variant="outlined">Download CSV</Button>
                            </CsvDownloader>
                            <Button color="primary" onClick={() => handleOpenModal()} variant="contained">
                                {"Create Source"}
                            </Button>
                            <SourcesDialog
                                edit={editModal}
                                me={me}
                                onClose={() => setOpenModal(false)}
                                onSubmit={handleUpdateSource}
                                open={openModal}
                                selectedSource={selectedSource}
                                sources={sortedSources}
                            />
                            <Button component="label" variant="contained" tabIndex={-1}>
                                Upload Source file
                                <VisuallyHiddenInput type="file" onChange={(event) => handleUploadSource(event.target.files)} multiple />
                            </Button>
                        </Stack>
                    </Stack>
                );
            },
        },
        model.sources,
    );

    return renderSources;
};

const VisuallyHiddenInput = styled("input")({
    clip: "rect(0 0 0 0)",
    clipPath: "inset(50%)",
    height: 1,
    overflow: "hidden",
    position: "absolute",
    bottom: 0,
    left: 0,
    whiteSpace: "nowrap",
    width: 1,
});

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

export { SourcesTable, Type, Mode };
