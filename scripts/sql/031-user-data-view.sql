create view user_data_list as
       select user_data.id, data_path, data_type, data_label, data_comment,
              data_group, is_shared, shared_profiles, shared_users,
              data_tool, data_source, created_at, modification_date, login as owned_by
       from user_data, users
       where user_data.owned_by = users.id;
