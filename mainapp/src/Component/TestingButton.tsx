import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";

import CheckIcon from "@mui/icons-material/Check";
import ErrorIcon from "@mui/icons-material/Error";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import NetworkCheckIcon from "@mui/icons-material/NetworkCheck";

import * as React from "react";

export const TestingButton = (props) => {
    const { disabled, id, onTest } = props;

    const [color, setColor] = React.useState("primary");
    const [icon, setIcon] = React.useState(<NetworkCheckIcon />);
    const [title, setTitle] = React.useState("");

    const handleClick = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
        <IconButton color={color} onClick={handleClick} title={title} variant="contained">
            {icon}
        </IconButton>
    );
};
