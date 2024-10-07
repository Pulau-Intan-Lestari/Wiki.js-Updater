import { gql } from "@apollo/client/core";
import { Request, Response } from "express";
// Define the structure for a foreign key relation
type ForeignKeyRelation = {
    targetTable: string;
    targetColumn: string;
} | null;  // The relation is either an object or null (if no relation exists)

// Define the structure for a field (column) in a table
type TableField = {
    columnName: string;
    dataType: string;
    maxLength: string | null;
    relation: ForeignKeyRelation;
};

// Define the structure for a table within a schema
type SchemaTable = {
    tableName: string;
    fields: TableField[];
};

// Define the structure for a schema, which contains multiple tables
type SchemaData = {
    schemaName: string;
    tables: SchemaTable[];
};

export const GetDataFromDBPG = async (req: Request) => {
    const result: SchemaData[] = []

    const schemas: { SchemaName: string }[] = await req.prisma.$queryRaw`
        SELECT
            name AS SchemaName 
        FROM
            sys.schemas 
        WHERE
            name NOT IN (
                'INFORMATION_SCHEMA',
                'guest',
                'sys',
                'db_owner',
                'db_securityadmin',
                'db_accessadmin',
                'db_backupoperator',
                'db_denydatareader',
                'db_denydatawriter',
                'db_ddladmin',
                'db_datareader',
                'db_datawriter',
                'db_owner',
                'db_accessadmin' 
            );
    `
    // Initialize the schema object with an empty tables array
    for (const schema of schemas) {
        const schemaData: SchemaData = {
            schemaName: schema.SchemaName,
            tables: []
        };
        const dataTable: { TABLE_NAME: string }[] = await req.prisma.$queryRaw`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA = ${schema.SchemaName};
        `

        for (const table of dataTable) {
            const fields: {
                COLUMN_NAME: string,
                DATA_TYPE: string,
                CHARACTER_MAXIMUM_LENGTH: string
            }[] = await req.prisma.$queryRaw`
                SELECT 
                    COLUMN_NAME, 
                    DATA_TYPE, 
                    CHARACTER_MAXIMUM_LENGTH
                FROM 
                    INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = ${table.TABLE_NAME} AND TABLE_SCHEMA = ${schema.SchemaName};
            `

            const relations: { SourceColumn: string, TargetTable: string, TargetColumn: string }[] = await req.prisma.$queryRaw`
                SELECT 
                    c1.name AS SourceColumn,
                    t2.name AS TargetTable,
                    c2.name AS TargetColumn
                FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
                    JOIN sys.tables t1 ON fkc.parent_object_id = t1.object_id
                    JOIN sys.schemas s1 ON t1.schema_id = s1.schema_id
                    JOIN sys.columns c1 ON fkc.parent_object_id = c1.object_id AND fkc.parent_column_id = c1.column_id
                    JOIN sys.tables t2 ON fkc.referenced_object_id = t2.object_id
                    JOIN sys.schemas s2 ON t2.schema_id = s2.schema_id
                    JOIN sys.columns c2 ON fkc.referenced_object_id = c2.object_id AND fkc.referenced_column_id = c2.column_id
                WHERE s1.name = ${schema.SchemaName} AND t1.name = ${table.TABLE_NAME};
            `

            // Create a map for easy lookup of relations by SourceColumn
            const relationMap = relations.reduce((acc, relation) => {
                acc[relation.SourceColumn] = {
                    targetTable: relation.TargetTable,
                    targetColumn: relation.TargetColumn
                };
                return acc;
            }, {});

            // Create table data with fields and combine it with relations
            const tableData = {
                tableName: table.TABLE_NAME,
                fields: fields.map(f => ({
                    columnName: f.COLUMN_NAME,
                    dataType: f.DATA_TYPE,
                    maxLength: f.CHARACTER_MAXIMUM_LENGTH,
                    relation: relationMap[f.COLUMN_NAME] || null  // Add relation info if it exists
                }))
            };

            // Push the table data into the schema's tables array
            schemaData.tables.push(tableData);
        }

        result.push(schemaData);
    }

    return result;
}

export const CreatePage = async (req: Request, res: Response) => {
    try {
        const base_path = "databases/server-cikampek"
        const data = await GetDataFromDBPG(req);

        for (const ss of data) {
            for (const tb of ss.tables) {
                let fieldsString = ''
                for (const d of tb.fields) {
                    fieldsString += `<tr>
                            <td>
                                <h6>${d.columnName}</h6>
                            </td>
                            <td>${d.dataType}</td>
                            <td>${d.maxLength ?? "-"}</td>
                            <td>${d?.relation?.targetColumn ? `<a href="/en/${base_path}/${d.relation.targetTable}#${d.relation.targetColumn}">${d.relation.targetTable} - ${d.relation.targetColumn}</a>` : '-'}</td>
                        </tr>`
                }
                console.log(`Inserting page ${tb.tableName}...`)
                await CreateSinglePage(req, {
                    title: tb.tableName,
                    description: 'Auto generated from Node.js',
                    content: `
                        <figure class="table" style="width:100%;">
                            <table>
                            <tbody>
                                <tr>
                                    <td>Fields</td>
                                    <td>Types</td>
                                    <td>Length</td>
                                    <td>Relation</td>
                                </tr>
                                ${fieldsString}
                            </tbody>
                            </table>
                        </figure>
                    `,
                    editor: "ckeditor",
                    isPrivate: false,
                    isPublished: true,
                    locale: 'en',
                    path: `${base_path}/${tb.tableName}`,
                    tags: [ss.schemaName, 'database', 'server-cikampek'],
                });
            }
        }


        return res.status(200).json({
            info: "ok"
        });
    } catch (error) {
        return res.status(400).json(error)
    }
}

export const CreateSinglePage = async (req: Request, variables: {
    content: string,
    description: string,
    editor: "ckeditor" | "markdown",
    isPublished: boolean,
    isPrivate: boolean,
    locale: "en",
    path: string,
    tags: string[],
    title: string
}) => {
    const CREATE_PAGE = gql`
        mutation CreatePage(
            $content: String!,
            $description: String!,
            $editor: String!,
            $isPublished: Boolean!,
            $isPrivate: Boolean!,
            $locale: String!,
            $path: String!,
            $tags: [String!]!,
            $title: String!
        ) {
            pages {
                create(
                    content: $content,
                    description: $description,
                    editor: $editor,
                    isPublished: $isPublished,
                    isPrivate: $isPrivate,
                    locale: $locale,
                    path: $path,
                    tags: $tags,
                    title: $title
                ) {
                    page {
                        id
                    }
                }
            }
        }
    `;

    const response = await req.apolloClient.mutate({
        mutation: CREATE_PAGE,
        variables,
    });
    return response
}