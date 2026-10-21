using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RoleManagement.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProfileEmployeeCodes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EmployeeCode",
                table: "UserProfiles",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.Sql(
                """
                WITH numbered AS (
                    SELECT "Id", ROW_NUMBER() OVER (ORDER BY "Id") AS n
                    FROM "UserProfiles"
                )
                UPDATE "UserProfiles" AS profile
                SET "EmployeeCode" = 'NVK' || LPAD(numbered.n::text, 3, '0')
                FROM numbered
                WHERE profile."Id" = numbered."Id";
                """);

            migrationBuilder.AlterColumn<string>(
                name: "EmployeeCode",
                table: "UserProfiles",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(16)",
                oldMaxLength: 16,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserProfiles_EmployeeCode",
                table: "UserProfiles",
                column: "EmployeeCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserProfiles_EmployeeCode",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "EmployeeCode",
                table: "UserProfiles");
        }
    }
}
