-- Add a view to retrieve the profiles and set the schema_types as texts array
create view profiles_list as
       select label, theme, allowed_tools, allowed_databases, access_control, is_shared, schema_types::text[], quota, max_nt_export_triples, create_source, maximum_source,
              max_writable_triples, max_upload_triples, max_user_data_records
       from profiles;
