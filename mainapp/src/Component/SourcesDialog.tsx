import { FormEvent, useEffect, useState } from "react";

import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Autocomplete,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    FormGroup,
    InputAdornment,
    MenuItem,
    Stack,
    TextField,
} from "@mui/material";
import { Assignment, CheckBox, CheckBoxOutlineBlank, ExpandMore, MiscellaneousServices, RuleFolder, Storage } from "@mui/icons-material";

import { ulid } from "ulid";
import { z } from "zod";

import { defaultSource, ServerSource, ServerSourceSchema, sourceHelp } from "../Source";
import { getUsers, User } from "../User";
import { HeadersList } from "./HeadersList";
import { HelpTooltip } from "./HelpModal";
import { UploadGraphModal } from "./UploadGraphModal";

type SourcesDialogProps = {
    edit: boolean;
    me: string;
    onClose: () => void;
    onSubmit: (source: ServerSource) => void;
    open: boolean;
    selectedSource?: ServerSource | null;
    sources: ServerSource[];
};

const permissionLabels = {
    allowIndividuals: "Allows user to create named individuals",
    isDraft: "Draft",
    editable: "Editable",
    published: "Published",
};

const emptySource: ServerSource = defaultSource(ulid());

export const SourcesDialog = ({ edit, me, onClose, onSubmit, open, selectedSource, sources }: SourcesDialogProps) => {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [groups, setGroups] = useState<string[]>([]);
    const [predicates, setPredicates] = useState<string[]>([]);
    const [schemaTypes, setSchemaTypes] = useState<string[]>([]);
    const [source, setSource] = useState<ServerSource>(emptySource);
    const [sourcesNames, setSourcesNames] = useState<string[]>([]);
    const [sourcesPrefixes, setSourcesPrefixes] = useState<string[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [uploadGraphModal, setUploadGraphModal] = useState(false);
    const [sourceName, setSourceName] = useState("");

    const handleField = (key: string, value: string | string[] | Record<string, string> | boolean | null) => {
        if (key.startsWith("predicates")) {
            const [_section, option] = key.split(".");
            setSource({ ...source, predicates: { ...source.predicates, [option]: value } });
        } else if (key.startsWith("sparql_server")) {
            const [_section, option] = key.split(".");
            setSource({ ...source, sparql_server: { ...source.sparql_server, [option]: value } });
        } else {
            setSource({ ...source, [key]: value });
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const parsedForm = handleValidation(source);
        if (parsedForm.success) {
            onSubmit(source);
            setSourceName(source.name);
            setUploadGraphModal(true);
        }
    };

    const handleValidation = (data: ServerSource) => {
        const schema = ServerSourceSchema.superRefine((value: ServerSource, context) => {
            if (!edit && sourcesNames.includes(value.name)) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "This name is already used by another source",
                    path: ["name"],
                });
            }
            if (sourcesPrefixes.includes(value.prefix)) {
                if (!edit || value.prefix !== source.prefix) {
                    context.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "This prefix is already used by another source",
                        path: ["prefix"],
                    });
                }
            }
            if (value.baseUri && !value.baseUri.endsWith("/") && !value.baseUri.endsWith("#")) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Base URI must end with '/' or '#'",
                    path: ["baseUri"],
                });
            }
            if (value.group.trim().length < 3) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "3 chars min",
                    path: ["group"],
                });
            }
            if (value.group.startsWith("/")) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Cannot start with /",
                    path: ["group"],
                });
            }
            if (value.published && value.group.trim() === "PRIVATE") {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Published source can't be in PRIVATE group",
                    path: ["group"],
                });
            }
        });
        const parsedForm = schema.safeParse(data);

        if (!parsedForm.success) {
            const currentErrors: Record<string, string> = {};
            parsedForm.error.issues.forEach((issue) => {
                issue.path.forEach((path) => {
                    currentErrors[path] = issue.message;
                });
            });
            setErrors(currentErrors);
        } else {
            setErrors({});
        }

        return parsedForm;
    };

    useEffect(() => {
        setErrors({});

        if (!open) {
            // Reset the source when the dialog close
            const newSource = defaultSource(ulid());
            newSource.owner = me;
            setSource(newSource);
        } else {
            // Load the selectors when the dialog open
            setGroups([...new Set(sources.flatMap((s) => s.group))].filter((g) => g.length > 0));
            setPredicates([...new Set(sources.flatMap((s) => s.taxonomyPredicates))]);
            setSchemaTypes([...new Set(sources.flatMap((s) => s.schemaType))]);
            setSourcesNames(sources.map((s) => s.name));
            setSourcesPrefixes(sources.map((s) => s.prefix));
            void getUsers().then((availableUsers) => setUsers(availableUsers));

            if (selectedSource) {
                setSource(selectedSource as ServerSource);
            }
        }
    }, [open]);

    const icon = <CheckBoxOutlineBlank fontSize="small" />;
    const checkedIcon = <CheckBox fontSize="small" />;

    return (
        <>
            <Dialog
                aria-labelledby="sources-dialog-title"
                aria-describedby="sources-dialog-description"
                fullWidth
                maxWidth="md"
                open={open}
                onClose={onClose}
                PaperProps={{ component: "form", onSubmit: handleSubmit }}
            >
                <DialogTitle id="sources-dialog-title">{edit ? `Edit ${source.name}` : "New Source"}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1, maxHeight: "75%" }}>
                        {edit || (
                            <TextField
                                autoFocus
                                error={errors.name !== undefined}
                                fullWidth
                                helperText={errors.name}
                                id="name"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <HelpTooltip title={sourceHelp.name} />
                                        </InputAdornment>
                                    ),
                                }}
                                label="Name"
                                name="name"
                                onChange={(event) => handleField("name", event.target.value)}
                                required
                                value={source.name}
                            />
                        )}
                        <TextField
                            fullWidth
                            error={errors.graphUri !== undefined}
                            helperText={errors.graphUri}
                            id="graphUri"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <HelpTooltip title={sourceHelp.graphUri} />
                                    </InputAdornment>
                                ),
                            }}
                            label="Graph URI"
                            name="graphUri"
                            onChange={(event) => handleField("graphUri", event.target.value)}
                            required
                            value={source.graphUri}
                        />
                        <Stack direction="row" spacing={1} useFlexGap>
                            <TextField
                                error={errors.prefix !== undefined}
                                helperText={errors.prefix}
                                id="prefix"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <HelpTooltip title={sourceHelp.prefix} />
                                        </InputAdornment>
                                    ),
                                }}
                                label="Prefix"
                                name="prefix"
                                onChange={(event) => handleField("prefix", event.target.value)}
                                required
                                value={source.prefix}
                            />
                            <TextField
                                fullWidth
                                error={errors.baseUri !== undefined}
                                helperText={errors.baseUri}
                                id="baseUri"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <HelpTooltip title={sourceHelp.baseUri} />
                                        </InputAdornment>
                                    ),
                                }}
                                label="Base URI"
                                name="baseUri"
                                onChange={(event) => handleField("baseUri", event.target.value)}
                                required
                                value={source.baseUri}
                            />
                        </Stack>
                        <Autocomplete
                            freeSolo
                            id="group"
                            onChange={(_e, value) => handleField("group", value)}
                            onInputChange={(_e, value) => handleField("group", value)}
                            options={groups}
                            renderInput={(params) => <TextField error={errors.group !== undefined} helperText={errors.group} {...params} label="Group" required />}
                            value={source.group}
                        />
                        <Autocomplete
                            disableCloseOnSelect
                            freeSolo
                            id="imports"
                            limitTags={5}
                            multiple
                            onChange={(_e, value) => handleField("imports", value)}
                            options={sourcesNames}
                            renderInput={(params) => <TextField error={errors.imports !== undefined} helperText={errors.imports} {...params} label="Import Sources" />}
                            renderOption={(props, option, { selected }) => {
                                return (
                                    <li {...props}>
                                        <Checkbox checked={selected} checkedIcon={checkedIcon} icon={icon} key={`check-${option}`} style={{ marginRight: 2 }} />
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
                            value={source.imports}
                        />
                        <div>
                            <Accordion>
                                <AccordionSummary expandIcon={<ExpandMore />} aria-controls="source-sparql-content" id="source-sparql-header">
                                    <Stack direction="row" spacing={1} useFlexGap>
                                        <Storage />
                                        {"Sparql Server"}
                                    </Stack>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Stack spacing={2} useFlexGap>
                                        <Stack direction="row" spacing={1} useFlexGap>
                                            <TextField
                                                fullWidth
                                                id="url"
                                                InputProps={{
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <HelpTooltip title={sourceHelp.sparql_server.url} />
                                                        </InputAdornment>
                                                    ),
                                                }}
                                                label="URL"
                                                name="url"
                                                onChange={(event) => handleField("sparql_server.url", event.target.value)}
                                                value={source.sparql_server.url}
                                            />
                                            <TextField
                                                id="method"
                                                InputProps={{
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <HelpTooltip title={sourceHelp.sparql_server.method} />
                                                        </InputAdornment>
                                                    ),
                                                }}
                                                label="HTTP Method"
                                                name="method"
                                                onChange={(event) => handleField("sparql_server.method", event.target.value)}
                                                select
                                                sx={{ width: 1 / 4 }}
                                                value={source.sparql_server.method ? source.sparql_server.method.toUpperCase() : "POST"}
                                            >
                                                <MenuItem key="GET" value="GET">
                                                    GET
                                                </MenuItem>
                                                <MenuItem key="POST" value="POST">
                                                    POST
                                                </MenuItem>
                                            </TextField>
                                        </Stack>
                                        <HeadersList headers={source.sparql_server.headers} onSubmit={(headers: Record<string, string>) => handleField("sparql_server.headers", headers)} />
                                    </Stack>
                                </AccordionDetails>
                            </Accordion>
                            <Accordion>
                                <AccordionSummary expandIcon={<ExpandMore />} aria-controls="source-lineage-content" id="source-lineage-header">
                                    <Stack direction="row" spacing={1} useFlexGap>
                                        <Assignment />
                                        {"Lineage Predicates"}
                                    </Stack>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Stack spacing={2} useFlexGap>
                                        <Autocomplete
                                            disableCloseOnSelect
                                            freeSolo
                                            id="taxonomyPredicates"
                                            limitTags={2}
                                            multiple
                                            onChange={(_e, value) => handleField("taxonomyPredicates", value)}
                                            options={predicates}
                                            renderInput={(params) => (
                                                <TextField error={errors.taxonomyPredicates !== undefined} helperText={errors.taxonomyPredicates} {...params} label="Taxonomy Predicates" />
                                            )}
                                            renderOption={(props, option, { selected }) => {
                                                return (
                                                    <li {...props}>
                                                        <Checkbox checked={selected} checkedIcon={checkedIcon} icon={icon} key={`check-${option}`} style={{ marginRight: 2 }} />
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
                                            value={source.taxonomyPredicates}
                                        />
                                        <TextField
                                            id="topClassFilter"
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <HelpTooltip title={sourceHelp.topClassFilter} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            label="Top Class Filters"
                                            multiline
                                            onChange={(event) => handleField("topClassFilter", event.target.value)}
                                            rows={4}
                                            value={source.topClassFilter}
                                        />
                                    </Stack>
                                </AccordionDetails>
                            </Accordion>
                            <Accordion>
                                <AccordionSummary expandIcon={<ExpandMore />} aria-controls="source-permissions-content" id="source-permissions-header">
                                    <Stack direction="row" spacing={1} useFlexGap>
                                        <RuleFolder />
                                        {"Permissions"}
                                    </Stack>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Stack spacing={2} useFlexGap>
                                        <TextField
                                            error={errors.owner !== undefined}
                                            fullWidth
                                            helperText={errors.owner}
                                            id="owner"
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <HelpTooltip title={sourceHelp.owner} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            label="Owner"
                                            name="owner"
                                            onChange={(event) => handleField("owner", event.target.value)}
                                            select
                                            value={source.owner}
                                        >
                                            {users.map((user: User) => (
                                                <MenuItem key={user.id} value={user.login}>
                                                    {user.login}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                        <FormGroup>
                                            {Object.entries(permissionLabels).map(([key, label]) => (
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={source[key as keyof ServerSource] as boolean}
                                                            key={`check-${key}`}
                                                            onChange={(event) => handleField(key, event.target.checked)}
                                                        />
                                                    }
                                                    key={key}
                                                    label={label}
                                                />
                                            ))}
                                        </FormGroup>
                                    </Stack>
                                </AccordionDetails>
                            </Accordion>
                            <Accordion>
                                <AccordionSummary expandIcon={<ExpandMore />} aria-controls="source-others-content" id="source-others-header">
                                    <Stack direction="row" spacing={1} useFlexGap>
                                        <MiscellaneousServices />
                                        {"Others Parameters"}
                                    </Stack>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Stack spacing={2} useFlexGap>
                                        <TextField
                                            error={errors.controller !== undefined}
                                            fullWidth
                                            helperText={errors.controller}
                                            id="controller"
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <HelpTooltip title={sourceHelp.controller} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            label="Controller"
                                            name="controller"
                                            onChange={(event) => handleField("controller", event.target.value)}
                                            select
                                            value={source.controller}
                                        >
                                            {["Sparql_OWL", "Sparql_SKOS", "Sparql_INDIVIDUALS"].map((element) => (
                                                <MenuItem key={element} value={element}>
                                                    {element}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                        <TextField
                                            error={errors.schemaType !== undefined}
                                            fullWidth
                                            helperText={errors.schemaType}
                                            id="schemaType"
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <HelpTooltip title={sourceHelp.schemaType} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            label="Schema Type"
                                            name="schemaType"
                                            onChange={(event) => handleField("schemaType", event.target.value)}
                                            select
                                            value={source.schemaType}
                                        >
                                            {schemaTypes.map((element) => (
                                                <MenuItem key={element} value={element}>
                                                    {element}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                        {source.schemaType === "SKOS" && (
                                            <Stack direction="row" spacing={1} useFlexGap>
                                                <TextField
                                                    fullWidth
                                                    id="broaderPredicate"
                                                    label="Broader Predicate"
                                                    name="broaderPredicate"
                                                    onChange={(event) => handleField("predicates.broaderPredicate", event.target.value)}
                                                    value={source.predicates.broaderPredicate}
                                                />
                                                <TextField
                                                    fullWidth
                                                    id="lang"
                                                    label="Lang"
                                                    name="lang"
                                                    onChange={(event) => handleField("predicates.lang", event.target.value)}
                                                    sx={{ width: 1 / 4 }}
                                                    value={source.predicates.lang}
                                                />
                                            </Stack>
                                        )}
                                    </Stack>
                                </AccordionDetails>
                            </Accordion>
                        </div>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button autoFocus onClick={onClose}>
                        Cancel
                    </Button>
                    <Button color="primary" type="submit">
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
            {uploadGraphModal && source ? <UploadGraphModal indexAfterSuccess={true} open={true} onClose={() => setUploadGraphModal(false)} sourceName={sourceName} /> : null}{" "}
        </>
    );
};
