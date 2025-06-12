
var ShareUserData_bot = (function () {
    var self = {};

    self.start = function (workflow, _params, callbackFn) {
        self.title = _params.title || "Share";
        var startParams = _botEngine.fillStartParams(arguments);
        
        if (!workflow) {
            workflow = self.workflow;
        }
        self.params = { profiles: [] , users : []};
        _botEngine.init(ShareUserData_bot, workflow, null, function () {
            _botEngine.startParams = startParams;
            if (_params) {
                for (var key in _params) {
                    self.params[key] = _params[key];
                }
            }
            _botEngine.nextStep();
        });
    };

    self.workflow = {
        startFn: {
           _OR: {
                "Share with profile": { chooseProfileFn:{afterChooseProfileFn: self.workflowChooseProfile} },
                "Share with user": {chooseUserFn: {afterChooseUserFn: self.workflowChooseUser} },
            },
        },
    };

    self.workflowChooseProfile = {
       
            _OR: { 
                "Share with other profile":{chooseProfileFn:{afterChooseProfileFn: self.workflowChooseProfile} },
                "end":{ setSharedProfilesFn: {} }
            }      
    };
    self.workflowChooseUser = {
        _OR: {
            "Share with other user":{chooseUserFn:{afterChooseUserFn: self.workflowChooseUser} },
            "end":{ setSharedUsersFn: {} }
        }
    };

    self.functionTitles = {
        startFn: "Start bot ",
        chooseProfile: "Choose a profile to share with",
        chooseUser: "Choose a user to share with",
    };

    self.functions = {
         startFn: function () {
            _botEngine.nextStep();
        },
        chooseProfileFn: function () {
            if(self.profiles) {
                _botEngine.showList(self.profiles, "profiles");
            }
            $.ajax({
                url: `${Config.apiUrl}/profiles`,
                type: "GET",
                dataType: "json",
                success: function (data) {
                    var profiles = data?.resources;
                    if (profiles && Object.keys(profiles).length > 0) {
                        self.profiles = Object.keys(profiles);
                        if(!self.profiles.includes('_all')){
                            self.profiles.push('_all');
                        }

                        _botEngine.showList(self.profiles, "profiles");
                    } else {
                        _botEngine.showMessage("No profiles available to share with.");
                        _botEngine.end();
                    }
                },
                error: function (xhr, status, error) {
                    _botEngine.showMessage("Error fetching profiles: " + error);
                    _botEngine.end();
                }
            });
        },
        chooseUserFn: function () {
            if(self.users) {
                _botEngine.showList(self.users, "users");
            }
            $.ajax({
                url: `${Config.apiUrl}/users`,
                type: "GET",
                dataType: "json",
                success: function (data) {
                    var usersResult = Object.values(data?.resources);
                    var users = usersResult.map(user=>Object.keys(user)[0] )
                    if (users && Object.keys(users).length > 0) {
                        self.users = users;
                        if(!self.users.includes('_all')){
                            self.users.push('_all');
                        }

                        _botEngine.showList(self.users, "users");
                    } else {
                        _botEngine.showMessage("No users available to share with.");
                        _botEngine.end();
                    }
                },
                error: function (xhr, status, error) {
                    _botEngine.showMessage("Error fetching users: " + error);
                    _botEngine.end();
                }
            });
          
        },

        setSharedProfilesFn: function () {
            if (self.params.profiles && self.params.profiles.length > 0) {
                if(self.params.userData && self.params.userData.id){
                    // patch user data with shared profiles
                    if(self.params.profiles.includes('_all')){
                        self.params.userData.data.shared_profiles = self.profiles;
                    }else{
                        self.params.userData.data.shared_profiles = self.params.profiles;
                    }
                    UserDataWidget.currentTreeNode = self.params.userData;
                    UserDataWidget.saveMetadata(self.params.userData.data.data_label,self.params.userData.data.data_type,self.params.userData.data.data_content, self.params.userData.data.data_group, function () {
                        UI.message("User data shared with profiles: " + self.params.profiles.join(", ")); 
                        _botEngine.end();
                    });
                }
            }
            _botEngine.end();
        },
        setSharedUsersFn: function () {
            if (self.params.users && self.params.users.length > 0) {
                if(self.params.userData && self.params.userData.id){
                    // patch user data with shared users
                    if(self.params.users.includes('_all')){
                        self.params.userData.data.shared_users = self.users;
                    }else{
                        self.params.userData.data.shared_users = self.params.users;
                    }
                    UserDataWidget.currentTreeNode = self.params.userData;
                    UserDataWidget.saveMetadata(self.params.userData.data.data_label,self.params.userData.data.data_type,self.params.userData.data.data_content, self.params.userData.data.data_group, function () {
                        UI.message("User data shared with users: " + self.params.users.join(", ")); 
                        _botEngine.end();
                    });
                }
            }
            _botEngine.end();
        },
        afterChooseProfileFn: function () {
            //_botEngine.previousStep();
            _botEngine.currentObj = self.workflowChooseProfile;
            _botEngine.nextStep(self.workflowChooseProfile);
        },
        
        afterChooseUserFn: function () {
            //_botEngine.previousStep();
            _botEngine.currentObj = self.workflowChooseUser;
            _botEngine.nextStep(self.workflowChooseUser);
        },

    };
    return self;
})();   

export default ShareUserData_bot;
window.ShareUserData_bot = ShareUserData_bot;
