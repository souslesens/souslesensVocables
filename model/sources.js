const fs = require("fs");
const { Lock } = require("async-await-mutex-lock");
const { config, configSourcesPath, configProfilesPath } = require("./config");
const { ProfileModel } = require("./profiles");

const lock = new Lock();

class SourceModel {
    constructor(sourcesPath, profilesPath) {
        this.configSourcesPath = sourcesPath;
        this.profileModel = new ProfileModel(profilesPath);
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

    _getAllowedSources = async (sources, user) => {
        const profiles = await this.profileModel._read();
        // convert objects to lists
        const profilesList = Object.entries(profiles);
        const sourcesList = Object.entries(sources);
        // get profiles of user
        const userProfilesList = profilesList.filter(([profileName, profile]) => {
            if (user.groups.includes(profileName)) {
                return [profileName, profile];
            }
        });
        // get [[<sourceName>, <accessControl>]] list
        const allAccessControl = userProfilesList.flatMap(([_k, profile]) => {
            const sourcesAccessControl = profile.sourcesAccessControl;
            const allowedSourceSchemas = profile.allowedSourceSchemas;
            return sourcesList
                .filter(([sourceName, source]) => {
                    if (allowedSourceSchemas.includes(source.schemaType)) {
                        return [sourceName, source];
                    }
                })
                .map(([sourceName, source]) => {
                    const schemaType = source.schemaType;
                    const group = source.group;
                    const treeStr = [schemaType, group, sourceName].join("/");
                    // find the closest parent accessControl
                    const closestParent = Object.entries(sourcesAccessControl)
                        .filter(([k, v]) => {
                            if (treeStr === k || treeStr.startsWith(`${k}/`)) {
                                return [k, v];
                            }
                        })
                        .reduce((acc, current) => (acc[0].length >= current[0].length ? acc : current), ["", ""]);
                    return [sourceName, closestParent[1]];
                });
        });

        // get read and readwrite sources only. add formalOntologySourceLabel with read
        const allowedSources = allAccessControl
            .filter(([sourceName, acl]) => {
                if (["read", "readwrite"].includes(acl)) {
                    return sourceName;
                }
            })
            .concat([[config.formalOntologySourceLabel, "read"]]);
        // sort and uniq. If a source have read and readwrite, keep readwrite
        // to keep readwrite, sort read first. fromEntries will keep the last
        const sortedAndReducedAllowedSources = Object.fromEntries(
            allowedSources
                .sort((s1, s2) => {
                    if (s1[0] < s2[0]) {
                        return -1;
                    }
                    if (s1[0] > s2[0]) {
                        return 1;
                    }
                    return 0;
                })
                .sort((s1, s2) => {
                    if (s1[1] < s2[1]) {
                        return -1;
                    }
                    if (s1[1] > s2[1]) {
                        return 1;
                    }
                    return 0;
                })
        );

        // filter sources with sortedAndReducedAllowedSources
        const filterSourcesList = sourcesList.filter(([sourceName, source]) => {
            if (sourceName in sortedAndReducedAllowedSources) {
                source["accessControl"] = sortedAndReducedAllowedSources[sourceName];
                return [sourceName, source];
            }
        });
        return await this._sortSources(Object.fromEntries(filterSourcesList));
    };

    getAllSources = async () => {
        return await this._sortSources(await this._read());
    };

    getUserSources = async (user) => {
        const allSources = await this._read();
        if (user.login === "admin" || user.groups.includes("admin")) {
            return await this._getAdminSources(allSources);
        }
        return await this._getAllowedSources(allSources, user);
    };

    addSource = async (newSource) => {
        await lock.acquire("SourcesThread");
        try {
            const sources = await this._read();
            if (newSource.id === undefined) {
                newSource.id = newSource.name;
            }
            if (Object.keys(sources).includes(newSource.id)) {
                throw Error("Source already exists, try updating it.");
            }
            sources[newSource.id] = newSource;
            await this._write(sources);
        } finally {
            lock.release("SourcesThread");
        }
    };
}

const sourceModel = new SourceModel(configSourcesPath, configProfilesPath);

module.exports = { SourceModel, sourceModel };
