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

interface UsersData {
    id: number;
    data_type: string;
    data_label: string;
    data_comment: string;
    data_group: string;
    data_tool: string;
    data_source: string;
    is_shared: boolean;
    shared_profiles: string[];
    shared_users: string[];
    readwrite: boolean;
    created_at: string;
    modification_date: string;
    owned_by: number;
}

declare global {
    interface Window {
        UsersDataManagement: {
            createApp: () => void;
        };
    }
}

export default function UsersDataManagement() {
    const [usersData, setUsersData] = useState<UsersData[]>([]);

    const fetchUsersData = async () => {
        const response = await fetch("/api/v1/users/data");
        const data = (await response.json()) as UsersData[];
        setUsersData(data);
    };

    const deleteUserData = async (userDataId: number) => {
        await fetch(`/api/v1/users/data/${userDataId}`, { method: "DELETE" });
        await fetchUsersData();
    };

    useEffect(() => {
        void fetchUsersData();
    }, []);
    return (
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
    );
}

window.UsersDataManagement.createApp = function createApp() {
    const container = document.getElementById("mount-users-data-management-here");

    const root = createRoot(container!);
    root.render(<UsersDataManagement />);
    return root.unmount.bind(root);
};
