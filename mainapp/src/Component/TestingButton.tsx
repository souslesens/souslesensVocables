import { useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";

import CheckIcon from "@mui/icons-material/Check";
import ErrorIcon from "@mui/icons-material/Error";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import NetworkCheckIcon from "@mui/icons-material/NetworkCheck";

interface TestingButtonProps {
    id: string;
}

export const TestingButton = ({ id }: TestingButtonProps) => {
    const [color, setColor] = useState<"success" | "error" | "warning" | "primary">("primary");
    const [icon, setIcon] = useState(<NetworkCheckIcon />);
    const [title, setTitle] = useState("");

    const handleClick = async () => {
        setIcon(<CircularProgress color="secondary" size="1.5rem" />);

        const response = await fetch(`/api/v1/admin/databases/test/${id}`);

        switch (response.status) {
            case 200:
                setColor("success");
                setIcon(<CheckIcon />);
                break;
            case 403:
                setColor("error");
                setIcon(<ErrorIcon />);
                setTitle("You are not authorized to access this database");
                break;
            default:
                setColor("warning");
                setIcon(<LinkOffIcon />);
                setTitle("This database is not available");
        }
    };

    return (
        <IconButton color={color} onClick={handleClick} title={title}>
            {icon}
        </IconButton>
    );
};
