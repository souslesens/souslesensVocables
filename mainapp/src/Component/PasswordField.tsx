import { useState } from "react";
import { FormControl, IconButton, InputAdornment, InputLabel, OutlinedInput } from "@mui/material";

import { Visibility, VisibilityOff } from "@mui/icons-material";

export const PasswordField = (props) => {
    const { disabled, error, id, label, onChange, required, value } = props;

    const [display, setDisplay] = useState(false);

    const handleClick = () => setDisplay(!display);
    const handleMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault();

    return (
        <FormControl error={error} fullWidth helperText={error}>
            <InputLabel htmlFor={id}>{label}</InputLabel>
            <OutlinedInput
                disabled={disabled}
                endAdornment={
                    <InputAdornment position="end">
                        <IconButton aria-label="toggle password visibility" onClick={handleClick} onMouseDown={handleMouseDown} edge="end">
                            {display ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                    </InputAdornment>
                }
                id={id}
                label={label}
                name={id}
                onChange={onChange}
                required={required}
                type={display ? "text" : "password"}
                value={value}
            />
        </FormControl>
    );
};
