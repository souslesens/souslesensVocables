const { userModel } = require("./users");
const { profileModel } = require("./profiles");

class CleanUserData {
    _remove_not_existing_users_from_shared_users = async (shared_users) => {
        const all_users = await userModel.getUserAccounts();
        const existing_login = Object.values(all_users).map((u) => u.login);
        const results = shared_users.filter((shared_user) => {
            if (existing_login.includes(shared_user)) {
                return true;
            }
        });
        return results;
    };

    _remove_not_existing_profiles_from_shared_profiles = async (shared_profiles) => {
        const all_profiles = await profileModel.getAllProfiles();
        const existing_profiles = Object.values(all_profiles).map((p) => p.name);
        const results = shared_profiles.filter((shared_profile) => {
            if (existing_profiles.includes(shared_profile)) {
                return true;
            }
        });
        return results;
    };

    clean = async (userData) => {
        userData.shared_users = await this._remove_not_existing_users_from_shared_users(userData.shared_users);
        userData.shared_profiles = await this._remove_not_existing_profiles_from_shared_profiles(userData.shared_profiles);
        return userData;
    };
}

const cleanUserData = new CleanUserData();
module.exports = { cleanUserData };
