using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RoleManagement.Api.Migrations
{
    /// <inheritdoc />
    public partial class ReassignEmployeeCodesByPosition : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE "UserProfiles"
                SET "EmployeeCode" = 'TMP' || "Id"::text;

                WITH ranked AS (
                    SELECT
                        profile."Id",
                        UPPER(BTRIM(position."Code")) AS prefix,
                        ROW_NUMBER() OVER (
                            PARTITION BY UPPER(BTRIM(position."Code"))
                            ORDER BY profile."Id"
                        ) AS n
                    FROM "UserProfiles" AS profile
                    INNER JOIN "Users" AS account ON account."Id" = profile."UserId"
                    INNER JOIN "Positions" AS position ON position."Id" = account."PositionId"
                    WHERE UPPER(BTRIM(position."Code")) ~ '^[A-Z]{2,10}$'
                )
                UPDATE "UserProfiles" AS profile
                SET "EmployeeCode" = ranked.prefix || LPAD(ranked.n::text, 3, '0')
                FROM ranked
                WHERE profile."Id" = ranked."Id";

                WITH leftover AS (
                    SELECT
                        "Id",
                        ROW_NUMBER() OVER (ORDER BY "Id") AS n
                    FROM "UserProfiles"
                    WHERE "EmployeeCode" LIKE 'TMP%'
                ),
                floor AS (
                    SELECT COALESCE(MAX(CAST(SUBSTRING("EmployeeCode" FROM 4) AS integer)), 0) AS max_n
                    FROM "UserProfiles"
                    WHERE "EmployeeCode" ~ '^NVK[0-9]{3}$'
                )
                UPDATE "UserProfiles" AS profile
                SET "EmployeeCode" = 'NVK' || LPAD((floor.max_n + leftover.n)::text, 3, '0')
                FROM leftover
                CROSS JOIN floor
                WHERE profile."Id" = leftover."Id";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
