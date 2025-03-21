create table if not exists user_data(
       id               integer primary key generated by default as identity,
       data_path        text,
       data_type        text,
       data_label       text default '',
       data_comment     text default '',
       data_group       text default '',
       data_content     json default '{}'::json,
       data_tool        text default '',
       data_source      text default '',
       is_shared        boolean default false,
       shared_profiles  text[],
       shared_users     text[],
       created_at       timestamp not null default now(),
       owned_by         integer references users (id)
);

-- Add a view to retrieve the list of data without their content
create or replace view user_data_list as
       select user_data.id, data_path, data_type, data_label, data_comment,
              data_group, is_shared, shared_profiles, shared_users,
              data_tool, data_source, created_at, login as owned_by
       from user_data, users
       where user_data.owned_by = users.id;
