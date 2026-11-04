import { readSchemaFile } from "../../bin/AI/ontologyFromDb/schemaFile.js";

const pgDumpSchema = `
--
-- PostgreSQL database dump
--

\\restrict abcdef

SET statement_timeout = 0;
SELECT pg_catalog.set_config('search_path', '', false);

CREATE SCHEMA sales;
CREATE DOMAIN public."Name" AS character varying(50);
CREATE DOMAIN public."Flag" AS boolean NOT NULL;

CREATE FUNCTION public.touch() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.modified = now();
    RETURN NEW;
END;
$$;

CREATE TABLE public.customer (
    id integer NOT NULL,
    name public."Name" NOT NULL,
    active public."Flag",
    tags text[],
    note character varying(10)
);
ALTER TABLE public.customer OWNER TO postgres;

CREATE TABLE public.order_line (
    order_id integer NOT NULL,
    line_no integer NOT NULL,
    customer_id integer
);

CREATE TABLE sales.archive (
    id integer
);

CREATE VIEW public.v_customer AS
 SELECT id FROM public.customer;

COPY public.customer (id, name) FROM stdin;
1	it's; a row
\\.

COMMENT ON TABLE public.customer IS 'People; who buy';
COMMENT ON COLUMN public.customer.id IS 'Primary key for customers.';
COMMENT ON COLUMN public.v_customer.id IS 'On a view';
COMMENT ON TABLE sales.customer IS 'Same name, another schema';

ALTER TABLE ONLY public.customer
    ADD CONSTRAINT customer_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.order_line
    ADD CONSTRAINT order_line_pkey PRIMARY KEY (order_id, line_no);
ALTER TABLE ONLY public.order_line
    ADD CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES public.customer(id);
ALTER TABLE public.customer CLUSTER ON customer_pkey;
`;

describe("readSchemaFile", () => {
    test("reads a pg_dump into the shape of getSchemaDescription", () => {
        const { schema, leftOutViewCount, leftOutTables } = readSchemaFile(pgDumpSchema);

        expect(schema.columns).toContainEqual({ table_name: "customer", column_name: "name", data_type: "character varying", is_nullable: "NO" });
        expect(schema.columns).toContainEqual({ table_name: "customer", column_name: "active", data_type: "boolean", is_nullable: "NO" });
        expect(schema.columns).toContainEqual({ table_name: "customer", column_name: "tags", data_type: "text[]", is_nullable: "YES" });
        expect(schema.columns).toHaveLength(8);
        expect(schema.primaryKeys).toEqual([
            { table_name: "customer", column_name: "id" },
            { table_name: "order_line", column_name: "order_id" },
            { table_name: "order_line", column_name: "line_no" },
        ]);
        expect(schema.foreignKeys).toEqual([{ constraint_name: "fk_customer", table_name: "order_line", column_name: "customer_id", referenced_table: "customer", referenced_column: "id" }]);
        expect(leftOutViewCount).toBe(1);
        expect(leftOutTables).toEqual(["sales.archive"]);
    });

    test("keeps the comments of the tables read, not those of a view", () => {
        const { schema } = readSchemaFile(pgDumpSchema);

        expect(schema.comments).toEqual([
            { table_name: "customer", column_name: null, comment: "People; who buy" },
            { table_name: "customer", column_name: "id", comment: "Primary key for customers." },
        ]);
    });

    test("never keeps the rows of a dump", () => {
        expect(JSON.stringify(readSchemaFile(pgDumpSchema))).not.toContain("a row");
    });

    test("reads keys declared inside CREATE TABLE", () => {
        const { schema } = readSchemaFile(
            "CREATE TABLE customer (id integer PRIMARY KEY); CREATE TABLE orders (id integer, customer_id integer REFERENCES customer(id), line integer, PRIMARY KEY (id, line), FOREIGN KEY (line) REFERENCES customer(id));",
        );

        expect(schema.columns).toContainEqual({ table_name: "customer", column_name: "id", data_type: "integer", is_nullable: "NO" });
        expect(schema.primaryKeys).toEqual([
            { table_name: "customer", column_name: "id" },
            { table_name: "orders", column_name: "id" },
            { table_name: "orders", column_name: "line" },
        ]);
        expect(schema.foreignKeys.map((foreignKey) => foreignKey.constraint_name)).toEqual(["orders_customer_id_fkey", "orders_line_fkey"]);
    });

    test("refuses what it cannot read rather than dropping it", () => {
        expect(readSchemaFile("PGDMP binary").error).toContain("Plain");
        expect(readSchemaFile("SET statement_timeout = 0;").error).toContain("no table");
        expect(readSchemaFile("CREATE TABLE [dbo].[customer] ([id] [int]);").error).toContain("could not be read");
    });
});
