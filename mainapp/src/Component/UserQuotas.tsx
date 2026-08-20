import { useState, useEffect } from "react";

import { Alert, Box, Chip, CircularProgress, LinearProgress, Paper, Stack, Typography } from "@mui/material";

import { Severity } from "../user-settings";

/** `cap: null` means nothing limits this, `cap: 0` means the door is closed. */
type Quota = { used: number | null; cap: number | null; allowed?: boolean };

type Quotas = {
    sources: Quota;
    mappingTriples: Quota;
    uploadTriples: Quota;
    userDataRecords: Quota;
    exportTriplesPerCall: Quota;
};

type QuotaRow = {
    key: keyof Quotas;
    label: string;
    explanation: string;
};

const rows: QuotaRow[] = [
    { key: "sources", label: "Sources Allowed", explanation: "Deleting a source frees a slot." },
    { key: "mappingTriples", label: "Triples written with Mapping Modeler", explanation: "Deleting triples frees room." },
    { key: "uploadTriples", label: "Uploaded triples", explanation: "Deleting triples frees room." },
    { key: "userDataRecords", label: "User data entries", explanation: "Deleting an entry frees a slot." },
    { key: "exportTriplesPerCall", label: "Mapping Modeler maximum exported Triples", explanation: "Limit for one export, nothing to use up." },
];

const formatNumber = (value: number) => value.toLocaleString("en-US");

const QuotaLine = ({ row, quota }: { row: QuotaRow; quota: Quota }) => {
    const isForbidden = quota.cap === 0 || quota.allowed === false;
    const isUnlimited = quota.cap === null;
    /* A cap with no usage to compare it against, like the per-export ceiling: worth
     * showing as a figure, but a gauge would suggest a stock that fills up. */
    const hasGauge = !isForbidden && !isUnlimited && quota.used !== null;
    const percentage = hasGauge ? Math.min(100, ((quota.used as number) / (quota.cap as number)) * 100) : 0;

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} useFlexGap flexWrap="wrap">
                    <Typography variant="subtitle2">{row.label}</Typography>
                    {isForbidden ? (
                        <Chip size="small" color="error" label="Not allowed" />
                    ) : isUnlimited ? (
                        <Chip size="small" variant="outlined" label={quota.used === null ? "No limit" : `${formatNumber(quota.used)} — no limit`} />
                    ) : (
                        <Typography variant="body2">
                            {quota.used === null ? `${formatNumber(quota.cap as number)} max` : `${formatNumber(quota.used)} / ${formatNumber(quota.cap as number)}`}
                        </Typography>
                    )}
                </Stack>
                {hasGauge ? <LinearProgress variant="determinate" value={percentage} color={percentage >= 100 ? "error" : percentage >= 80 ? "warning" : "primary"} /> : null}
                <Typography variant="caption" color="text.secondary">
                    {row.explanation}
                </Typography>
            </Stack>
        </Paper>
    );
};

interface UserQuotasProps {
    handleSnackbar: (msg: string, severity?: Severity) => void;
}

const UserQuotas = ({ handleSnackbar }: UserQuotasProps) => {
    const [quotas, setQuotas] = useState<Quotas | undefined>(undefined);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        async function fetchQuotas() {
            try {
                const response = await fetch("/api/v1/users/quotas");
                if (!response.ok) {
                    throw new Error(response.statusText);
                }
                setQuotas((await response.json()) as Quotas);
            } catch (error) {
                console.error(error);
                handleSnackbar("Could not read your quotas", "error");
            } finally {
                setIsLoading(false);
            }
        }
        void fetchQuotas();
    }, []);

    if (isLoading) {
        return (
            <Stack alignItems="center" sx={{ p: 4 }} spacing={2}>
                <CircularProgress />
                <Typography variant="caption" color="text.secondary">
                    Loading your quotas…
                </Typography>
            </Stack>
        );
    }

    if (quotas === undefined) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="error">Your quotas could not be read.</Alert>
            </Box>
        );
    }

    const hasAnyLimit = rows.some((row) => quotas[row.key].cap !== null);

    return (
        <Stack spacing={2} sx={{ p: 2 }}>
            {hasAnyLimit ? null : <Alert severity="info">No limit applies to your account.</Alert>}
            {rows.map((row) => (
                <QuotaLine key={row.key} row={row} quota={quotas[row.key]} />
            ))}
        </Stack>
    );
};

export { UserQuotas };
