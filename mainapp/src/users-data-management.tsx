import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { IconButton } from "@mui/material";
import TextField from "@mui/material/TextField";
import { Edit, Delete } from "@mui/icons-material";

import { UserData, UserDataDialog } from "./Component/UserDataDialog";
import { EditUserDataDialog } from "./Component/EditUserDataDialog";
import { DeleteDialog } from "./Component/DeleteDialog";
import { cleanUpText } from "./Utils";

export default function UsersDataManagement() {
    const [usersData, setUsersData] = useState<UserData[]>([]);
    const [displayModal, setDisplayModal] = useState<boolean>(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [displayEditDialog, setDisplayEditDialog] = useState<boolean>(false);
    const [selectedUserDataId, setSelectedUserDataId] = useState<number | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [filtering, setFiltering] = useState("");
    const [orderBy, setOrderBy] = useState<keyof UserData>("id");
    const [order, setOrder] = useState<"asc" | "desc">("asc");

    const fetchUsersData = async () => {
        const response = await fetch("/api/v1/users/data");
        const data = (await response.json()) as UserData[];
        setUsersData(data);
    };

    const deleteUserData = async (userDataId: number) => {
        await fetch(`/api/v1/users/data/${userDataId}`, { method: "DELETE" });
        await fetchUsersData();
    };

    const handleOpenCreateModal = () => {
        setEditingUser(null);
        setDisplayModal(true);
    };

    const handleCloseDialog = () => setDisplayModal(false);

    const handleOpenEditDialog = (userDataId: number) => {
        setSelectedUserDataId(userDataId);
        setDisplayEditDialog(true);
    };

    const handleCloseEditDialog = () => {
        setDisplayEditDialog(false);
        setSelectedUserDataId(null);
    };

    const handleEditSave = () => {
        void fetchUsersData();
    };

    const handleOpenDeleteDialog = (userDataId: number, userDataLabel: string) => {
        setSelectedUserDataId(userDataId);
        setIsDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setIsDeleteDialogOpen(false);
        setSelectedUserDataId(null);
    };

    const handleDeleteUserData = async () => {
        if (!selectedUserDataId) return;
        
        try {
            const response = await fetch(`/api/v1/users/data/${selectedUserDataId}`, { method: "DELETE" });
            
            if (response.status === 200) {
                await fetchUsersData();
            } else {
                const errorData = await response.json();
                console.error(errorData.message);
            }
        } catch (error) {
            console.error(error);
        }
        
        handleCloseDeleteDialog();
    };

    const handleRequestSort = (property: keyof UserData) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const handleSave = async (newData: UserData) => {
        if (editingUser) {
            // update
            await fetch(`/api/v1/users/data/${editingUser.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newData),
            });
        } else {
            // create
            await fetch(`/api/v1/users/data`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newData),
            });
        }
        await fetchUsersData();
        handleCloseDialog();
    };

    const defaultUserValue = editingUser ? { ...editingUser, id: String(editingUser.id) } : {};

    useEffect(() => {
        void fetchUsersData();
    }, []);
    return (
        <>
            <Stack direction="column" spacing={{ xs: 2 }} sx={{ m: 4 }} useFlexGap>
                <TextField 
                    label="Search..." 
                    id="filter-user-data" 
                    onChange={(event) => setFiltering(event.target.value)} 
                    fullWidth
                />
                <TableContainer sx={{ height: "400px" }} component={Paper}>
                    <Table sx={{ minWidth: 650 }} aria-label="simple table">
                        <TableHead>
                            <TableRow>
                                <TableCell style={{ fontWeight: "bold" }}>
                                    <TableSortLabel active={orderBy === "id"} direction={order} onClick={() => handleRequestSort("id")}>
                                        Id
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell style={{ fontWeight: "bold" }} align="right">
                                    <TableSortLabel active={orderBy === "data_label"} direction={order} onClick={() => handleRequestSort("data_label")}>
                                        Label
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell style={{ fontWeight: "bold" }} align="right">
                                    <TableSortLabel active={orderBy === "data_type"} direction={order} onClick={() => handleRequestSort("data_type")}>
                                        Type
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell style={{ fontWeight: "bold" }} align="right">
                                    <TableSortLabel active={orderBy === "data_tool"} direction={order} onClick={() => handleRequestSort("data_tool")}>
                                        Tool
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell style={{ fontWeight: "bold" }} align="right">
                                    <TableSortLabel active={orderBy === "data_source"} direction={order} onClick={() => handleRequestSort("data_source")}>
                                        Source
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell style={{ fontWeight: "bold" }} align="right">
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {usersData
                                .filter((row) => {
                                    const filterText = cleanUpText(filtering);
                                    return (
                                        cleanUpText(row.data_label).includes(filterText) ||
                                        cleanUpText(row.data_comment).includes(filterText)
                                    );
                                })
                                .slice()
                                .sort((a, b) => {
                                    let left = "";
                                    let right = "";

                                    if (orderBy === "id") {
                                        left = String(a.id);
                                        right = String(b.id);
                                    } else if (orderBy === "data_label") {
                                        left = a.data_label;
                                        right = b.data_label;
                                    } else if (orderBy === "data_type") {
                                        left = a.data_type;
                                        right = b.data_type;
                                    } else if (orderBy === "data_tool") {
                                        left = a.data_tool;
                                        right = b.data_tool;
                                    } else if (orderBy === "data_source") {
                                        left = a.data_source;
                                        right = b.data_source;
                                    }

                                    return order === "asc" ? left.localeCompare(right) : right.localeCompare(left);
                                })
                                .map((row) => (
                                    <TableRow key={row.id} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                                        <TableCell align="left" component="th" scope="row">
                                            {row.id}
                                        </TableCell>
                                        <TableCell align="right">{row.data_label}</TableCell>
                                        <TableCell align="right">{row.data_type}</TableCell>
                                        <TableCell align="right">{row.data_tool}</TableCell>
                                        <TableCell align="right">{row.data_source}</TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                                                <IconButton aria-label="edit" color="primary" onClick={() => handleOpenEditDialog(row.id)} size="small" title="Edit">
                                                    <Edit />
                                                </IconButton>
                                                <IconButton aria-label="delete" color="error" onClick={() => handleOpenDeleteDialog(row.id, row.data_label)} size="small" title="Delete">
                                                    <Delete />
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Stack direction="row" justifyContent="center" spacing={{ xs: 1 }} useFlexGap>
                    <Button variant="contained" onClick={handleOpenCreateModal}>
                        create
                    </Button>
                </Stack>
            </Stack>

            <UserDataDialog open={displayModal} onClose={handleCloseDialog} onSave={handleSave} defaultValue={defaultUserValue} />
            <EditUserDataDialog open={displayEditDialog} onClose={handleCloseEditDialog} onSave={handleEditSave} userDataId={selectedUserDataId || 0} />
            <DeleteDialog
                description={`The user data '${selectedUserDataId ? usersData.find(u => u.id === selectedUserDataId)?.data_label : ''}' will be deleted. Are you sure?`}
                onClose={handleCloseDeleteDialog}
                onDelete={handleDeleteUserData}
                isOpen={isDeleteDialogOpen}
                title="Delete User Data"
            />
        </>
    );
}
