const fs = require("fs");
const { Lock } = require("async-await-mutex-lock");
const { config, configSourcesPath, configProfilesPath } = require("./config");
const { ProfileModel } = require("./profiles");

/**
 * @typedef {import("./UserTypes").UserAccount} UserAccount
 * @typedef {import("./SourceTypes").Source} Source
 * @typedef {import("./SourceTypes").SourceWithAccessControl} SourceWithAccessControl
 */

const lock = new Lock();

class SourceModel {
    /**
     * @param {string} sourcesPath - path of the sources.json file
     * @param {string} profilesPath - path of the profiles.json file
     */
    constructor(sourcesPath, profilesPath) {
        this.configSourcesPath = sourcesPath;
        this.profileModel = new ProfileModel(profilesPath);
    }

    /**
     * @returns {Promise<Record<string, Source>>} a collection of sources
     */
    _read = async () => {
        return fs.promises.readFile(this.configSourcesPath).then((data) => JSON.parse(data.toString()));
    };

    /**
     * @param {Record<string, Source>} sources - a collection of sources
     */
    _write = async (sources) => {
        await fs.promises.writeFile(this.configSourcesPath, JSON.stringify(sources, null, 2));
    };

    /**
     * @param {Record<string, Source>} sources -  a collection of sources
     * @returns {Promise<Record<string, SourceWithAccessControl>>} a collection of sources
     */
    _addReadWriteToSources = async (sources) => {
        return Object.fromEntries(
            Object.entries(sources).map(([id, s]) => {
                const newSource = { ...s, accessControl: "readwrite" };
                return [id, newSource];
            })
        );
    };

    /**
     * @param {Record<string, Source>} sources -  a collection of sources
     * @returns {Promise<Record<string, SourceWithAccessControl>>} a collection of sources
     */
    _getAdminSources = async (sources) => {
        const adminSources = await this._addReadWriteToSources(sources);
        return adminSources;
    };

    /**
     * @param {Record<string, Source>} sources -  a collection of sources
     * @param {UserAccount} user -  a user account
     * @returns {Promise<Record<string, SourceWithAccessControl>>} a collection of sources
     */
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
        const filterSourcesList = sourcesList
            .filter(([sourceName, source]) => {
                if (sourceName in sortedAndReducedAllowedSources) {
                    return [sourceName, source];
                }
            })
            .map(([sourceName, source]) => {
                return [sourceName, { ...source, accessControl: sortedAndReducedAllowedSources[sourceName] }];
            });
        return Object.fromEntries(filterSourcesList);
    };

    /**
     * @returns {Promise<Record<string, Source>>} a collection of sources
     */
    getAllSources = async () => {
        return await this._read();
    };

    /**
     * @param {UserAccount} user -  a user account
     * @param {string} sourceName -  a source name
     * @returns {Promise<Source>} a collection of sources
     */
    getOneUserSource = async (user, sourceName) => {
        const userSources = await this.getUserSources(user);
        return userSources[sourceName];
    };

    /**
     * @param {UserAccount} user -  a user account
     * @returns {Promise<Record<string, SourceWithAccessControl>>} a collection of sources
     */
    getUserSources = async (user) => {
        const allSources = await this._read();
        if (user.login === "admin" || user.groups.includes("admin")) {
            return await this._getAdminSources(allSources);
        }
        return await this._getAllowedSources(allSources, user);
    };

    /**
     * @param {Source} newSource -  a source
     */
    addSource = async (newSource) => {
        await lock.acquire("SourcesThread");
        try {
            const sources = await this._read();
            newSource.id = newSource.name;
            if (Object.keys(sources).includes(newSource.id)) {
                throw Error("Source already exists, try updating it.");
            }
            sources[newSource.id] = newSource;
            await this._write(sources);
        } finally {
            lock.release("SourcesThread");
        }
    };

    /**
     * @param {string} sourceName -  a source name
     * @returns {Promise<boolean>} - true if the source exists
     */
    deleteSource = async (sourceName) => {
        await lock.acquire("SourcesThread");
        try {
            const sources = await this._read();
            const { [sourceName]: sourceToDelete, ...remainingSources } = sources;
            if (!sourceToDelete) {
                return false;
            }
            await this._write(remainingSources);
            return true;
        } finally {
            lock.release("SourcesThread");
        }
    };

    /**
     * @param {Source} source - a source
     * @returns {Promise<boolean>} - true if the source exists
     */
    updateSource = async (source) => {
        await lock.acquire("SourcesThread");
        try {
            const sources = await this._read();
            // XXX We currently find sources by their name
            // We would prefer to use their ids.
            if (!(source.name in sources)) {
                return false;
            }
            const updatedSources = { ...sources };
            // XXX same here
            updatedSources[source.name] = source;
            await this._write(updatedSources);
            return true;
        } finally {
            lock.release("SourcesThread");
        }
    };
}

const sourceModel = new SourceModel(configSourcesPath, configProfilesPath);

module.exports = { SourceModel, sourceModel };
