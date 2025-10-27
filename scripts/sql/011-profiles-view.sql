-- Add a view to retrieve the profiles and set the schema_types as texts array
create view profiles_list as
       select label, theme, allowed_tools, allowed_databases, access_control, is_shared, schema_types::text[]
       from profiles;
