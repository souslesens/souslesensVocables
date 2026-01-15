import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from "@mui/material";
import { ulid } from "ulid";
import { z } from "zod";

export const UserDataSchema = z.object({
    id: z.number(),
    data_type: z.string(),
    data_label: z.string(),
    data_comment: z.string().optional(),
    data_group: z.string().optional(),
    is_shared: z.boolean().default(false),
    shared_profiles: z.array(z.string()).default([]),
    shared_users: z.array(z.string()).default([]),
    created_at: z.string(),
    owned_by: z.number(),
    data_tool: z.string(),
    data_source: z.string(),
    modification_date: z.string(),
    readwrite: z.boolean().default(false),
});

export type UserData = z.infer<typeof UserDataSchema>;

interface UserDataDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: z.infer<typeof UserDataSchema>) => void;
    defaultValue?: Partial<z.infer<typeof UserDataSchema>>;
}

export const UserDataDialog: React.FC<UserDataDialogProps> = ({ open, onClose, onSave, defaultValue = {} }) => {
    const [label, setLabel] = useState(defaultValue.data_label ?? "");
    const [type, setType] = useState(defaultValue.data_type ?? "");
    const [tool, setTool] = useState(defaultValue.data_tool ?? "");
    const [source, setSource] = useState(defaultValue.data_source ?? "");

    /* reset fields when dialog is opened/closed */
    useEffect(() => {
        if (open) {
            setLabel(defaultValue.data_label ?? "");
            setType(defaultValue.data_type ?? "");
            setTool(defaultValue.data_tool ?? "");
            setSource(defaultValue.data_source ?? "");
        }
    }, [open, defaultValue]);

    const handleSave = () => {
        const now = new Date().toISOString();
        const data = {
            id: defaultValue.id ?? ulid(),
            data_type: type,
            data_label: label,
            data_comment: defaultValue.data_comment ?? "",
            data_group: defaultValue.data_group ?? "",
            is_shared: defaultValue.is_shared ?? false,
            shared_profiles: defaultValue.shared_profiles ?? [],
            shared_users: defaultValue.shared_users ?? [],
            created_at: defaultValue.created_at ?? now,
            owned_by: defaultValue.owned_by ?? 1,
            data_tool: tool,
            data_source: source,
            modification_date: now,
            readwrite: defaultValue.readwrite ?? false,
        };

        const parse = UserDataSchema.safeParse(data);
        if (!parse.success) {
            console.error("Validation error", parse.error.format());
            return;
        }

        onSave(parse.data);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Ajouter / Modifier une donnée</DialogTitle>
            <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField label="Label" value={label} onChange={(e) => setLabel(e.target.value)} fullWidth />
                <TextField label="Type" value={type} onChange={(e) => setType(e.target.value)} fullWidth />
                <TextField label="Tool" value={tool} onChange={(e) => setTool(e.target.value)} fullWidth />
                <TextField label="Source" value={source} onChange={(e) => setSource(e.target.value)} fullWidth />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">
                    Annuler
                </Button>
                <Button onClick={handleSave} variant="contained" color="primary">
                    Enregistrer
                </Button>
            </DialogActions>
        </Dialog>
    );
};
