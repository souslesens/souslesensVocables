import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { ButtonWithConfirmation } from "./Component/ButtonWithConfirmation";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";

import { UserData, UserDataDialog } from "./Component/UserDataDialog";

declare global {
    interface Window {
        UsersDataManagement: {
            createApp: () => void;
        };
    }
}

export default function UsersDataManagement() {
    const [usersData, setUsersData] = useState<UserData[]>([]);
    const [displayModal, setDisplayModal] = useState<boolean>(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);

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
                <TableContainer sx={{ height: "400px" }} component={Paper}>
                    <Table sx={{ minWidth: 650 }} aria-label="simple table">
                        <TableHead>
                            <TableRow>
                                <TableCell style={{ fontWeight: "bold" }}>Id</TableCell>
                                <TableCell style={{ fontWeight: "bold" }} align="right">
                                    Label
                                </TableCell>
                                <TableCell style={{ fontWeight: "bold" }} align="right">
                                    Type
                                </TableCell>
                                <TableCell style={{ fontWeight: "bold" }} align="right">
                                    Tool
                                </TableCell>

                                <TableCell style={{ fontWeight: "bold" }} align="right">
                                    Source
                                </TableCell>
                                <TableCell style={{ fontWeight: "bold" }} align="right">
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {usersData.map((row) => (
                                <TableRow key={row.id} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                                    <TableCell align="left" component="th" scope="row">
                                        {row.id}
                                    </TableCell>
                                    <TableCell align="right">{row.data_label}</TableCell>
                                    <TableCell align="right">{row.data_type}</TableCell>
                                    <TableCell align="right">{row.data_tool}</TableCell>
                                    <TableCell align="right">{row.data_source}</TableCell>
                                    <TableCell align="right">
                                        <ButtonWithConfirmation func={deleteUserData} label="Delete" args={[row.id]} />
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
        </>
    );
}

window.UsersDataManagement.createApp = function createApp() {
    const container = document.getElementById("mount-users-data-management-here");

    const root = createRoot(container!);
    root.render(<UsersDataManagement />);
    return root.unmount.bind(root);
};
