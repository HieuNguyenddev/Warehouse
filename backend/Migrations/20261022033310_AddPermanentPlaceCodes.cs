using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RoleManagement.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPermanentPlaceCodes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PermanentProvinceCode",
                table: "UserProfiles",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PermanentWardCode",
                table: "UserProfiles",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PermanentProvinceCode",
                table: "UserProfiles");

            migrationBuilder.DropColumn(
                name: "PermanentWardCode",
                table: "UserProfiles");
        }
    }
}
