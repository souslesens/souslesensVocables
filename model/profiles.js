const fs = require("fs");
const knex = require("knex");
const z = require("zod");

const { readMainConfig } = require("./config");
const { toolModel } = require("./tools");

/**
 * @typedef {import("./UserTypes").UserAccount} UserAccount
 * @typedef {import("./ProfileTypes").Profile} Profile
 */

const ProfileObject = z.object({
    id: z.string(),
    name: z.string(),
    theme: z.string().default(""),
    allowedSourceSchemas: z.enum(["OWL", "SKOS"]).array().optional(),
    sourcesAccessControl: z.record(z.string(), z.string()).optional(),
    allowedTools: z.string().array().optional(),
    _type: z.string().default("profile"),
}).strict();

class ProfileModel {
    /**
     * @param {import("./tools").ToolModel} toolModel
     * @param {string} configProfilesPath - path of the profiles.json file
     */
    constructor(toolModel) {
        this._toolModel = toolModel;
        this._mainConfig = readMainConfig();
    }

    /**
     * Run zod to validate the received profile
     *
     * @param {Profile} profile - the profile to validate
     * @returns {Profile} - the response from the zod parser if success
     */
    _checkProfile = (profile) => {
        const check = ProfileObject.safeParse(profile);
        if (!check.success) {
            throw Error(`The profile do not follow the standard: ${JSON.stringify(check.error.issues)}`);
        }
        return check.data;
    };

    /**
     * Convert the profile to follow the database schema
     *
     * @param {Profile} profile - the profile to convert
     * @returns {ProfileDatabase} - the converted object with the correct fields
     */
    _convertToDatabase = (profile) => ({
        label: profile.name,
        theme: profile.theme || "",
        allowed_tools: profile.allowedTools || [],
        access_control: JSON.stringify(profile.sourcesAccessControl || {}),
        schema_types: profile.allowedSourceSchemas || [],
    });

    /**
     * Convert the profile to restore the legacy JSON schema
     *
     * @param {Profile} profile - the profile to convert
     * @returns {Profile} - the converted object with the correct fields
     */
    _convertToLegacy = (profile) => [ profile.label, {
        id: profile.label,
        name: profile.label,
        theme: profile.theme,
        allowedSourceSchemas: profile.schema_types,
        allowedTools: profile.allowed_tools,
        sourcesAccessControl: profile.access_control,
    }];

    /**
     * Retrieve the Postgres connection from the configuration information
     *
     * @returns {knex} - the knex connection instance configure to use Postgres
     */
    _getConnection = () => {
        return knex({ client: "pg", connection: this._mainConfig.database });
    };

    /**
     * @returns {Promise<Record<string, Profile>>} a collection of profiles
     */
    getAllProfiles = async () => {
        const conn = this._getConnection();
        const results = await conn.select("*").from("profiles_list");
        conn.destroy();

        const profiles = Object.fromEntries(
            results.map((profile) => this._convertToLegacy(profile))
        );

        if (profiles["admin"] === undefined) {
            profiles["admin"] = {
                id: "admin",
                name: "admin",
                theme: config.theme.defaultTheme,
                allowedSourceSchemas: ["OWL", "SKOS"],
                allowedTools: config.tools_available,
                sourcesAccessControl: {},
                defaultSourceAccessControl: "readwrite",
            }
        }

        return profiles;
    };

    /**
     * @param {UserAccount} user -  a user account
     * @returns {Promise<Record<string, Profile>>} a collection of profiles
     */
    getUserProfiles = async (user) => {
        const allProfiles = await this.getAllProfiles();
        if (user.login === "admin" || user.groups.includes("admin")) {
            return allProfiles;
        }

        return Object.fromEntries(
            Object.entries(allProfiles).filter(
                ([profileName, _profile]) => user.groups.includes(profileName)
            )
        );
    };

    /**
     * @param {UserAccount} user -  a user account
     * @returns {Promise<Array<{name: string, type: string}> | undefined>} a list of tools' name
     */
    getUserTools = async (user) => {
        try {
            const availableToolsNames = new Set(this._mainConfig.tools_available);
            if (user.login === "admin" || user?.groups.includes("admin")) {
                return this._toolModel.allTools.filter((tool) => availableToolsNames.has(tool.name));
            }
            const userProfiles = await this.getUserProfiles(user);
            const allowedToolsOrAll = new Set(Object.values(userProfiles).flatMap((v) => v.allowedTools));
            const allowedTools = allowedToolsOrAll.has("ALL") ? availableToolsNames : allowedToolsOrAll;
            return this._toolModel.allTools.filter((tool) => allowedTools.has(tool.name));
        } catch (error) {
            console.log(error);
        }
    };

    /**
     * @param {UserAccount} user -  a user account
     * @param {string} profileName -  a profile name
     * @returns {Promise<Profile>} a collection of profiles
     */
    getOneUserProfile = async (user, profileName) => {
        const userProfiles = await this.getUserProfiles(user);
        return userProfiles[profileName];
    };

    /**
     * @param {string} profileNameId -  a profile name or Id
     */
    deleteProfile = async (profileNameId) => {
        const conn = this._getConnection();
        const results = await conn.select("label").from("profiles").where("label", profileNameId).first();
        if (results === undefined) {
            conn.destroy();
            return false;
        }

        await conn("profiles").where("label", profileNameId).del();
        conn.destroy();
        return true;
    };

    /**
     * @param {Profile} profile - a profile
     * @returns {Promise<boolean>} true if profile exists
     */
    updateProfile = async (profile) => {
        const data = this._checkProfile(profile);

        const conn = this._getConnection();
        const results = await conn.select("label").from("profiles").where("label", data.name).first();
        if (results === undefined) {
            conn.destroy();
            return false;
        }

        await conn.update(this._convertToDatabase(data)).into("profiles").where("label", data.name);
        conn.destroy();
        return true;
    };

    /**
     * @param {Profile} profile - a profile
     */
    addProfile = async (profile) => {
        const data = this._checkProfile(profile);

        const conn = this._getConnection();
        const results = await conn.select("label").from("profiles").where("label", data.name).first();
        if (results !== undefined) {
            conn.destroy();
            throw Error("The profile already exists, try updating it");
        }

        await conn.insert(this._convertToDatabase(data)).into("profiles");
        conn.destroy();
    };

    /**
     * @param {string} profileName - the profile name
     * @returns {string} the theme currently defined for this profile
     */
    getThemeFromProfile = async (profileName) => {
        const conn = this._getConnection();
        const results = await conn.select("theme").from("profiles").where("label", profileName).first();
        conn.destroy();
        if (results === undefined) {
            return this._mainConfig.theme.defaultTheme;
        }

        return results.theme;
    };
}

const profileModel = new ProfileModel(toolModel);

module.exports = { ProfileModel, profileModel };
