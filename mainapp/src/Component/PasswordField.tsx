import { useState } from "react";
import { IconButton, InputAdornment, TextField, TextFieldProps } from "@mui/material";

import { Visibility, VisibilityOff } from "@mui/icons-material";

export const PasswordField = ({ disabled, error, helperText, id, label, onChange, required, value }: TextFieldProps) => {
    const [display, setDisplay] = useState(false);

    const handleClick = () => setDisplay(!display);
    const handleMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault();

    return (
        <TextField
            variant="outlined"
            fullWidth
            error={error}
            disabled={disabled}
            InputProps={{
                endAdornment: (
                    <InputAdornment position="end">
                        <IconButton aria-label="toggle password visibility" onClick={handleClick} onMouseDown={handleMouseDown} edge="end">
                            {display ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                    </InputAdornment>
                ),
            }}
            id={id}
            label={label}
            name={id}
            onChange={onChange}
            required={required}
            type={display ? "text" : "password"}
            value={value}
            helperText={helperText}
        />
    );
};
