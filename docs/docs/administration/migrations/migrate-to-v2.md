# Migrate to v2

From [version 2](https://github.com/souslesens/souslesensVocables/releases/tag/2.0.0),
users and profiles are stored in a PostgresQL databases.

Before migrate to version 2, you **MUST** checkout the latest 1.x.x release and run
all migrations of this last release.

## Create a database with the schema

### Docker

If you use the `docker-compose.yml` file from the
[souslesens/souslesensVocable](https://github.com/souslesens/souslesensVocables)
repository, a PostgresQL server is included.

Be sure the following variables are set in `.env` file:

- `POSTGRES_PASSWORD`
- `DATABASE_USER`
- `DATABASE_NAME`
- `DATABASE_PASSWORD`

Execute the init script manually:

```bash
docker compose exec -u postgres postgres "/docker-entrypoint-initdb.d/init-db.sh"
```

The script will create the database with the application role and the schema.

### Non-docker

Create a [database](https://www.postgresql.org/docs/current/sql-createdatabase.html)
and a [role](https://www.postgresql.org/docs/current/sql-createrole.html).

Then, exectue the scripts on the `scripts/sql` directory.

## Migrate the data

Run the migration script with `npm run migrate` to migrate data from the
`config/users/users.json` and the `config/profiles.json`. The migration will
keep the file. You have to delete it manually.
