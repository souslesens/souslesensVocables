import { useEffect, useState } from "react";
import { CheckBoxOutlineBlank, CheckBox } from "@mui/icons-material";
import { Dialog, DialogTitle, DialogContent, Stack, Autocomplete, TextField, Checkbox, Chip, FormGroup, FormControlLabel, DialogActions, Button, Typography, useTheme } from "@mui/material";
import { ServerSource, ServerSourceSchema } from "../Source";
import { LoadingButton } from "@mui/lab";

interface EditSourceDialogProps {
    onClose: () => void;
    onEditSuccess: (sources: ServerSource[]) => void;
    open: boolean;
    sources: ServerSource[];
    sourceName: string;
}

export const EditSourceDialog = ({ onClose, onEditSuccess, open, sources, sourceName }: EditSourceDialogProps) => {
    const [predicates, setPredicates] = useState<string[]>([]);
    const [sourceNames, setSourceNames] = useState<string[]>([]);
    const [source, setSource] = useState<ServerSource | undefined>();
    const [error, setError] = useState<string | undefined>();
    const [loading, setLoading] = useState(false);
    const theme = useTheme();

    const handleSubmitSource = async (source: ServerSource) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/sources/${sourceName}`, {
                body: JSON.stringify(source, null, "\t"),
                headers: { "Content-Type": "application/json" },
                method: "put",
            });

            const data = (await response.json()) as { resources: Record<string, ServerSource>; message: string };

            if (response.status == 200) {
                setError(undefined);
                onEditSuccess(Object.values(data.resources));
                onClose();
            } else {
                console.error(data.message);
                setError(`An error occured while updating: ${data.message}`);
            }
        } catch (error) {
            console.error(error);
            setError(`An error occured while updating: ${error as string}`);
        }
        setLoading(false);
    };

    useEffect(() => {
        const filteredSources = sources.filter((source) => source.name === sourceName);
        setPredicates([...new Set(sources.flatMap((s) => s.taxonomyPredicates))]);
        setSourceNames(sources.flatMap((s) => s.name));
        setSource(filteredSources[0]);
    }, [sources, sourceName]);

    const handleField = (fieldName: string, value: string | boolean | string[]) => {
        if (source) {
            setSource({ ...source, [fieldName]: value });
        }
    };

    const icon = <CheckBoxOutlineBlank fontSize="small" />;
    const checkedIcon = <CheckBox fontSize="small" />;

    return (
        <Dialog
            aria-labelledby="submit-dialog-title"
            fullWidth
            maxWidth="md"
            open={open}
            onClose={onClose}
            PaperProps={{
                component: "form",
                onSubmit: async (event: React.FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    const parsedForm = ServerSourceSchema.safeParse(source);
                    if (parsedForm.success && source) {
                        await handleSubmitSource(source);
                    }
                },
            }}
        >
            <DialogTitle id="submit-dialog-title">{`Edit ${sourceName}`}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }} useFlexGap>
                    <Autocomplete
                        disabled={loading}
                        freeSolo
                        id="taxonomyPredicates"
                        limitTags={2}
                        multiple
                        onChange={(_e, value) => handleField("taxonomyPredicates", value)}
                        options={predicates}
                        renderInput={(params) => <TextField {...params} label="Taxonomy Predicates" />}
                        renderOption={(props, option, { selected }) => {
                            return (
                                <li key={option} {...props}>
                                    <Checkbox icon={icon} checkedIcon={checkedIcon} style={{ marginRight: 2 }} checked={selected} />
                                    {option}
                                </li>
                            );
                        }}
                        renderTags={(tagValue, getTagProps) =>
                            tagValue.map((option, index) => {
                                const { key, ...rest } = getTagProps({ index });
                                return <Chip key={key} label={option} {...rest} />;
                            })
                        }
                        value={source ? source.taxonomyPredicates : []}
                    />
                    <TextField
                        disabled={loading}
                        id="topClassFilter"
                        label="Top Class Filters"
                        multiline
                        onChange={(event) => handleField("topClassFilter", event.target.value)}
                        rows={4}
                        value={source ? source.topClassFilter : ""}
                    />
                    <Autocomplete
                        disabled={loading}
                        disableCloseOnSelect
                        id="imports"
                        multiple
                        onChange={(_e, value) => handleField("imports", value)}
                        options={sourceNames}
                        renderInput={(params) => <TextField {...params} label="Imports" />}
                        renderOption={(props, option, { selected }) => {
                            return (
                                <li key={option} {...props}>
                                    <Checkbox icon={icon} checkedIcon={checkedIcon} style={{ marginRight: 2 }} checked={selected} />
                                    {option}
                                </li>
                            );
                        }}
                        renderTags={(tagValue, getTagProps) =>
                            tagValue.map((option, index) => {
                                const { key, ...rest } = getTagProps({ index });
                                return <Chip key={key} label={option} {...rest} />;
                            })
                        }
                        value={source ? source.imports : []}
                    />
                    <FormGroup>
                        <FormControlLabel
                            control={<Checkbox disabled={loading} checked={source ? source.allowIndividuals : false} onChange={(event) => handleField("allowIndividuals", event.target.checked)} />}
                            label="Allow Individuals?"
                        />
                    </FormGroup>
                    {error ? <Typography color={theme.palette.error.main}>{error}</Typography> : null}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button disabled={loading} onClick={onClose}>
                    Cancel
                </Button>
                <LoadingButton loading={loading} color="primary" type="submit">
                    Submit
                </LoadingButton>
            </DialogActions>
        </Dialog>
    );
};
