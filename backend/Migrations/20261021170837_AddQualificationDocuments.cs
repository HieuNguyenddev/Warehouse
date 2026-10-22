using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RoleManagement.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddQualificationDocuments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DocumentName",
                table: "Qualifications",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DocumentUrl",
                table: "Qualifications",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DocumentName",
                table: "Qualifications");

            migrationBuilder.DropColumn(
                name: "DocumentUrl",
                table: "Qualifications");
        }
    }
}
