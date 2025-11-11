import { useEffect, useState } from "react";
import { Chip, IconButton, Link, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, TextField } from "@mui/material";
import { Delete, Edit } from "@mui/icons-material";

import { DeleteDialog } from "./DeleteDialog";
import { getSourcesForUser, ServerSource } from "../Source";
import { cleanUpText, fetchMe } from "../Utils";
import { Severity } from "../user-settings";
import { EditSourceDialog } from "./EditSourceDialog";

type DialogType = "delete" | "edit";
type Order = "asc" | "desc";
type User = {
    login: string;
    allowSourceCreation: boolean;
    maxNumberCreatedSource: number;
};

const initialDialog = { delete: false, edit: false };
const initialUser = { login: "", allowSourceCreation: false, maxNumberCreatedSource: 0 };

interface UserSourcesProps {
    handleSnackbar: (msg: string, severity?: Severity) => void;
}

type OrderByType = "name" | "graphUri" | "group";

const UserSources = ({ handleSnackbar }: UserSourcesProps) => {
    const [filtering, setFiltering] = useState("");
    const [isOpen, setIsOpen] = useState<{ edit: boolean; delete: boolean }>(initialDialog);
    const [order, setOrder] = useState<Order>("asc");
    const [orderBy, setOrderBy] = useState<OrderByType>("name");
    const [selectedSource, setSelectedSource] = useState("");
    const [sources, setSources] = useState<ServerSource[]>([]);
    const [user, setUser] = useState<User>(initialUser);

    useEffect(() => {
        async function fetchSources() {
            setSources(await getSourcesForUser());

            const me = await fetchMe();
            setUser({
                login: me.user.login,
                allowSourceCreation: me.user.allowSourceCreation,
                maxNumberCreatedSource: me.user.maxNumberCreatedSource,
            });
        }
        void fetchSources();
    }, []);

    const handleCloseDialog = (dialogType: DialogType) => {
        setIsOpen({ ...isOpen, [dialogType]: false });
    };

    const handleDeleteSource = async () => {
        try {
            const response = await fetch(`/api/v1/sources/${selectedSource}`, { method: "delete" });

            const data = (await response.json()) as { resources: Record<string, ServerSource>; message: string };
            if (response.status == 200) {
                setSources(Object.values(data.resources));
                handleSnackbar(`The source '${selectedSource}' have been deleted`);
            } else {
                console.error(data.message);
                handleSnackbar(`An error occurs during deletion: ${data.message}`, "error");
            }
        } catch (error) {
            console.error(error);
            handleSnackbar(`An error occurs during deletion: ${error as string}`, "error");
        }
        setIsOpen({ ...isOpen, delete: false });
    };

    const onEditSuccess = (sources: ServerSource[]) => {
        setSources(sources);
        handleSnackbar(`The source '${selectedSource}' has been updated`);
    };

    const onOpenDialog = (dialogType: DialogType, sourceName?: string) => {
        setSelectedSource(sourceName ?? "");
        setIsOpen({ ...isOpen, [dialogType]: true });
    };

    const onSortTable = (property: OrderByType) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const sortedSources: ServerSource[] = sources.slice().sort((a: ServerSource, b: ServerSource) => {
        const left = a[orderBy] || "";
        const right = b[orderBy] || "";
        return order === "asc" ? left.localeCompare(right) : right.localeCompare(left);
    });

    return (
        <Stack spacing={2} sx={{ m: 4 }}>
            <TextField label="Filter Sources by name" id="filter-sources" onChange={(event) => setFiltering(event.target.value)} />
            <TableContainer sx={{ height: "400px" }} component={Paper}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{ fontWeight: "bold" }}>
                                <TableSortLabel active={orderBy === "name"} direction={order} onClick={() => onSortTable("name")}>
                                    Source Name
                                </TableSortLabel>
                            </TableCell>
                            <TableCell style={{ fontWeight: "bold" }}>
                                <TableSortLabel active={orderBy === "graphUri"} direction={order} onClick={() => onSortTable("graphUri")}>
                                    Graph URI
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="center" style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                                <TableSortLabel active={orderBy === "group"} direction={order} onClick={() => onSortTable("group")}>
                                    Group
                                </TableSortLabel>
                            </TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody sx={{ width: "100%", overflow: "visible" }}>
                        {sortedSources
                            .filter((source) => source.owner == user.login)
                            .filter((source) => cleanUpText(source.name).includes(cleanUpText(filtering)))
                            .map((source) => {
                                return (
                                    <TableRow key={source.name}>
                                        <TableCell>{source.name}</TableCell>
                                        <TableCell>
                                            <Link href={source.graphUri}>{source.graphUri}</Link>
                                        </TableCell>
                                        <TableCell align="center">{source.group ? <Chip label={source.group} size="small" /> : ""}</TableCell>
                                        <TableCell>
                                            <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                <IconButton aria-label="edit" color="primary" onClick={() => onOpenDialog("edit", source.name)} size="small">
                                                    <Edit />
                                                </IconButton>
                                                <IconButton aria-label="delete" color="error" onClick={() => onOpenDialog("delete", source.name)} size="small">
                                                    <Delete />
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                    </TableBody>
                </Table>
            </TableContainer>
            <DeleteDialog
                description={"The source will be erased from this instance. Are you sure?"}
                onClose={() => handleCloseDialog("delete")}
                onDelete={handleDeleteSource}
                isOpen={isOpen["delete"]}
                title={`Delete ${selectedSource}`}
            />
            <EditSourceDialog onClose={() => handleCloseDialog("edit")} onEditSuccess={onEditSuccess} open={isOpen["edit"]} sources={sources} sourceName={selectedSource} />
        </Stack>
    );
};

export { UserSources };
