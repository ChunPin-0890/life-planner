using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Server.Migrations
{
    /// <inheritdoc />
    public partial class AddGoalCounter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CurrentCount",
                table: "Goals",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TargetCount",
                table: "Goals",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CurrentCount",
                table: "Goals");

            migrationBuilder.DropColumn(
                name: "TargetCount",
                table: "Goals");
        }
    }
}
