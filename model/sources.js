const fs = require("fs");
const { configSourcesPath } = require("./config");
const { profileModel } = require("./profiles");

class SourceModel {
    constructor(path) {
        this.configSourcesPath = path;
    }

    _read = async () => {
        return fs.promises.readFile(this.configSourcesPath).then((data) => JSON.parse(data.toString()));
    };

    _write = async (sources) => {
        await fs.promises.writeFile(this.configSourcesPath, JSON.stringify(sources, null, 2));
    };
    _addReadWriteToSources = async (sources) => {
        return Object.fromEntries(
            Object.entries(sources).map(([id, s]) => {
                s.accessControl = "readwrite";
                return [id, s];
            })
        );
    };
    _sortSources = async (sources) => {
        return Object.fromEntries(
            Object.entries(sources).sort((a, b) => {
                return a[0].localeCompare(b[0]);
            })
        );
    };
    _getAdminSources = async (sources) => {
        const adminSources = await this._addReadWriteToSources(sources);
        const sortedAdminSources = await this._sortSources(adminSources);
        return sortedAdminSources;
    };
    _getAllowedSources = async (user, sources, profiles) => {
        // not implemented yet
    };

    getUserSources = async (user) => {
        const allSources = await this._read();
        if (user.login === "admin" || user.groups.includes("admin")) {
            return await this._getAdminSources(allSources);
        }
        const profiles = profileModel._read();
        return await this._getAllowedSources(allSources, profiles);
    };
}

const sourceModel = new SourceModel(configSourcesPath);

module.exports = { SourceModel, sourceModel };
