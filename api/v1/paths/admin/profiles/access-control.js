import { profileModel } from "../../../../../model/profiles.js";

const CSV_HEADERS = ["profile", "group", "source", "access"];

function escapeCsvField(value) {
    const str = String(value ?? "");
    if (/[",\r\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function buildCsvRow(fields) {
    return fields.map(escapeCsvField).join(",");
}

function lastSegment(path) {
    const idx = path.lastIndexOf("/");
    return idx === -1 ? path : path.slice(idx + 1);
}

function profilesAccessControlToCsv(profiles) {
    const rows = [buildCsvRow(CSV_HEADERS)];
    for (const [profileName, profile] of Object.entries(profiles)) {
        const sourcesAccessControl = profile.sourcesAccessControl || {};
        for (const [group, access] of Object.entries(sourcesAccessControl)) {
            rows.push(buildCsvRow([profileName, group, lastSegment(group), access]));
        }
    }
    return rows.join("\r\n");
}

export default function () {
    let operations = {
        GET,
    };

    async function GET(_req, res, _next) {
        try {
            const profiles = await profileModel.getAllProfiles();
            const csv = profilesAccessControlToCsv(profiles);
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", 'attachment; filename="profiles_access_control.csv"');
            res.status(200).send(csv);
        } catch (error) {
            res.status(500).json({ message: error.toString() });
        }
    }

    GET.apiDoc = {
        summary: "Export profile source access controls as CSV (admin only)",
        description:
            "Admin-only. Returns one CSV row per `sourcesAccessControl` entry of every profile. " +
            "Columns: `profile` (profile name), `group` (full source path key, e.g. `TSF/DATA_DOMAINS/0_ALL_TE_DATA_DOMAINS`), " +
            "`source` (last segment of the key), `access` (access level, e.g. `readwrite`).",
        security: [{ restrictAdmin: [] }],
        operationId: "adminExportProfilesAccessControl",
        produces: ["text/csv"],
        responses: {
            200: {
                description: "CSV file with one row per profile source access control entry.",
                headers: {
                    "Content-Disposition": {
                        type: "string",
                        description: 'attachment; filename="profiles_access_control.csv"',
                    },
                },
            },
            500: { description: "Internal error while reading profiles." },
        },
        tags: ["Profiles"],
    };

    return operations;
}
