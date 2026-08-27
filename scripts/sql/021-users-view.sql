-- Add a view to retrieve the list of users without the private data
-- Kept in its own file, like 011-profiles-view.sql: a migration that adds a
-- column has to drop the view and read it again, which it cannot do from a file
-- that also creates the type and the table.
create view public_users_list as
       select id, login, auth, profiles
       from users;
