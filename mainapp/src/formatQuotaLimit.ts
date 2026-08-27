const formatQuotaLimitDisplay = (rawLimit: string) => {
    if (!rawLimit) {
        return "";
    }
    return Number(rawLimit).toLocaleString("fr-FR");
};

const parseQuotaLimitInput = (displayedValue: string) => displayedValue.replace(/[^\d]/g, "");

export { formatQuotaLimitDisplay, parseQuotaLimitInput };
