import fs from "fs";
import { Lock } from "async-await-mutex-lock";
import { config, configSourcesPath } from "./config.js";
import { profileModel } from "./profiles.js";

/**
 * @typedef {import("./UserTypes").UserAccount} UserAccount
 * @typedef {import("./SourceTypes").Source} Source
 * @typedef {import("./SourceTypes").SourceWithAccessControl} SourceWithAccessControl
 * @typedef {import("./profiles").ProfileModel} ProfileModel
 */

const lock = new Lock();
// same prefix as CreateSLSVsource_bot.saveUploadSource
const temporaryUploadGraphUriPrefix = "http://temporary.graphUri.";

class SourceModel {
    /**
     * @param {ProfileModel} profileModel - path of the profiles.json file
     * @param {string} sourcesPath - path of the sources.json file
     */
    constructor(profileModel, sourcesPath) {
        this.profileModel = profileModel;
        this.configSourcesPath = sourcesPath;
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
            }),
        );
    };

    /**
     * @param {Record<string, Source>} sources -  a collection of sources
     * @param {UserAccount} user -  a user account
     * @returns {Promise<string[][]>} a collection of sources owned by
     * the user
     */
    _getOwnedSourcesListWithReadWrite = async (sources, user) => {
        return Object.entries(sources)
            .filter(([_id, source]) => {
                return source.owner === user.login;
            })
            .map(([id, _source]) => {
                return [id, "readwrite"];
            });
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
        const profiles = await this.profileModel.getAllProfiles();
        // convert objects to lists
        const profilesList = Object.entries(profiles);
        const sourcesList = Object.entries(sources);
        // get profiles of user
        const userProfilesList = profilesList.filter(([profileName, profile]) => {
            if (user.groups.includes(profileName)) {
                return [profileName, profile];
            }
            if (profileName == user.login) {
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
            .concat([[config.formalOntologySourceLabel, "read"]])
            .concat(await this._getOwnedSourcesListWithReadWrite(sources, user));

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
                }),
        );

        // filter sources with sortedAndReducedAllowedSources
        const filterSourcesList = sourcesList
            .filter(([sourceName, source]) => {
                if (sourceName in sortedAndReducedAllowedSources) {
                    return [sourceName, source];
                }
            })
            .map(([sourceName, source]) => {
                /* `editable: false` marks a source as read-only for everyone but the
                 * administrators, whatever the profiles or the ownership grant. Settled
                 * here, the only place a non-admin access control is decided, so every
                 * route and the SPARQL proxy filter inherit the restriction. */
                const accessControl = source.editable === false ? "read" : sortedAndReducedAllowedSources[sourceName];
                return [sourceName, { ...source, accessControl: accessControl }];
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
        if (this.isAdmin(user)) {
            return await this._getAdminSources(allSources);
        }
        return await this._getAllowedSources(allSources, user);
    };

    /**
     * @param {UserAccount} user - a user account
     * @returns {boolean} true when the user holds every right on every source
     */
    isAdmin = (user) => {
        return user.login === "admin" || (user.groups || []).includes("admin");
    };

    /**
     * Whether the user may write into a source, designated by its name or by its
     * named graph. Administrators may write anywhere, a graph that no source
     * declares included.
     * @param {UserAccount} user - a user account
     * @param {{name?: string, graphUri?: string}} target - the source written into
     * @returns {Promise<boolean>} true when the write is allowed
     */
    canWrite = async (user, target) => {
        if (this.isAdmin(user)) {
            return true;
        }
        const userSources = await this.getUserSources(user);
        const source = target.name !== undefined ? userSources[target.name] : Object.values(userSources).find((userSource) => userSource.graphUri === target.graphUri);
        return source !== undefined && source.accessControl === "readwrite";
    };

    /**
     * @param {UserAccount} user - a user account
     * @returns {Promise<Record<string, SourceWithAccessControl>>} a collection of sources owned by
     * user
     */
    getOwnedSources = async (user) => {
        const allSources = await this._read();
        const ownedSources = Object.fromEntries(
            Object.entries(allSources).filter(([name, source]) => {
                if (source.owner == user.login) {
                    return [name, source];
                }
            }),
        );
        return ownedSources;
    };

    /**
     * The OntoCreator upload source only lives until its graph moves to the final source,
     * so one of them is left out of `maxNumberCreatedSource`. One only: a user keeping
     * several would otherwise create sources without limit.
     *
     * @param {Record<string, Source>} ownedSources - the sources of one user
     * @returns {number} how many of them count against the source quota
     */
    countSourcesAgainstQuota = (ownedSources) => {
        const ownedSourcesList = Object.values(ownedSources);
        const temporaryUploadSources = ownedSourcesList.filter((source) => (source.graphUri || "").startsWith(temporaryUploadGraphUriPrefix));
        return ownedSourcesList.length - Math.min(temporaryUploadSources.length, 1);
    };

    /**
     * @param {UserAccount} user - a user account
     * @param {Source} source - an existing source
     * @throws {Error} with status 403 when the user is neither the owner of the source nor an admin
     */
    _checkSourceOwner = (user, source) => {
        if (!this.isAdmin(user) && source.owner !== user.login) {
            const error = new Error(`Only the owner of ${source.name} or an admin can change it`);
            error.status = 403;
            throw error;
        }
    };

    /**
     * @param {Record<string, Source>} sources - a collection of sources
     * @param {string} graphUri - a graph a non admin wants a source to declare
     * @throws {Error} with status 409 when another source already declares the graph
     */
    _checkGraphUriNotDeclared = (sources, graphUri) => {
        const sourcesList = Object.values(sources);
        // canWrite resolves a graph to its first declaring source, a shared graphUri would lend the other source's rights
        const declaringSource = sourcesList.find((source) => source.graphUri === graphUri);
        if (declaringSource) {
            const error = new Error(`Graph ${graphUri} is already declared by source ${declaringSource.name}`);
            error.status = 409;
            throw error;
        }
    };

    /**
     * addSource for a user. A non admin creates a private unpublished source it owns, on a graph
     * no other source declares.
     * @param {UserAccount} user - a user account
     * @param {Source} newSource - a source
     */
    addUserSource = async (user, newSource) => {
        if (this.isAdmin(user)) {
            return this.addSource(newSource);
        }
        const sources = await this._read();
        this._checkGraphUriNotDeclared(sources, newSource.graphUri);
        await this.addSource({ ...newSource, owner: user.login, published: false, group: `PRIVATE/${user.login}` });
    };

    /**
     * updateSource restricted to the owner of the source or an admin. A non admin cannot change
     * the fields that decide who sees and who writes the source, nor take a graph another source declares.
     * @param {UserAccount} user - a user account
     * @param {Source} updatedSource - the new descriptor of the source
     * @returns {Promise<boolean>} - true if the source exists
     */
    updateUserSource = async (user, updatedSource) => {
        const sources = await this._read();
        // same lookup order as updateSource, so the checked source is the one overwritten
        const storedSource = updatedSource.id in sources ? sources[updatedSource.id] : sources[updatedSource.name];
        if (!storedSource) {
            return false;
        }
        this._checkSourceOwner(user, storedSource);
        if (this.isAdmin(user)) {
            return this.updateSource(updatedSource);
        }
        if (updatedSource.graphUri !== storedSource.graphUri) {
            this._checkGraphUriNotDeclared(sources, updatedSource.graphUri);
        }
        const accessFields = {
            id: storedSource.id,
            owner: storedSource.owner,
            published: storedSource.published,
            group: storedSource.group,
            editable: storedSource.editable,
        };
        return this.updateSource({ ...updatedSource, ...accessFields });
    };

    /**
     * deleteSource restricted to the owner of the source or an admin.
     * @param {UserAccount} user - a user account
     * @param {string} sourceNameId - a source name or id
     * @returns {Promise<boolean>} - true if the source exists
     */
    deleteUserSource = async (user, sourceNameId) => {
        const sources = await this._read();
        const sourcesList = Object.values(sources);
        // same lookup order as deleteSource: name first, then id
        const storedSource = sources[sourceNameId] ?? sourcesList.find((source) => source.id === sourceNameId);
        if (!storedSource) {
            return false;
        }
        this._checkSourceOwner(user, storedSource);
        return this.deleteSource(sourceNameId);
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
                const error = new Error("Source already exists");
                error.status = 409;
                throw error;
            }
            sources[newSource.id] = newSource;
            await this._write(sources);
        } finally {
            lock.release("SourcesThread");
        }
    };

    /**
     * @param {string} sourceNameId -  a source name or id
     * @returns {Promise<boolean>} - true if the source exists
     */
    deleteSource = async (sourceNameId) => {
        const sources = await this._read();
        const { [sourceNameId]: sourceToDelete, ..._remainingSources } = sources;
        if (sourceToDelete) {
            return this._deleteSourceByName(sourceNameId);
        } else {
            // no source found. Try with id
            const sourcesList = Object.entries(sources);
            const sourceToDeleteWithId = sourcesList.find(([_name, source]) => {
                return source.id === sourceNameId;
            });
            if (sourceToDeleteWithId) {
                return this._deleteSourceByName(sourceToDeleteWithId[0]);
            }
        }
        return false;
    };

    /**
     * @param {string} sourceName -  a source name
     * @returns {Promise<boolean>} - true if the source exists
     */
    _deleteSourceByName = async (sourceName) => {
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
            const updatedSources = { ...sources };
            if (source.id in sources) {
                updatedSources[source.id] = source;
            } else if (source.name in sources) {
                updatedSources[source.name] = source;
            } else {
                return false;
            }
            await this._write(updatedSources);
            return true;
        } finally {
            lock.release("SourcesThread");
        }
    };
}

const sourceModel = new SourceModel(profileModel, configSourcesPath);

export { SourceModel, sourceModel };
