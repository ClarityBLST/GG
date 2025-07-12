import {
  CanvasRenderingContext2D,
  Image,
  createCanvas,
  loadImage,
  registerFont,
} from "canvas";
import fs from "fs";
import path from "path";

// Tipos

/**
 * Dibuja una tabla de leaderboard en un canvas y la devuelve como buffer.
 *
 * @param teams Lista de equipos con sus estadísticas
 * @param dateString Fecha formateada en string
 * @param background Imagen de fondo ya cargada (con loadImage)
 * @returns Buffer de imagen PNG
 */
export async function drawLeaderboardTable(
  teams: TeamCalculatedResult[],
  dateString: string,
  background: Image
): Promise<Buffer> {
  // registerFont("./fonts/A4SPEED.ttf", { family: "A4SPEED Bold" });

  console.log("Teams: " + JSON.stringify(teams, null, 2));

  const width = 1080;
  const height = 1920;
  const margin = 100;
  const columnWidths = [100, 375, 150, 100, 150];
  const rowHeight = 70;
  const rowGap = 10;
  const font = "A4SPEED Bold";

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(background, 0, 0, width, height);

  const tableX = margin;
  const headers = ["#", "Team Name", "Pos", "Kills", "Total"];
  let currentY = 400 + ((16 - teams.length) * (rowHeight + rowGap)) / 2;

  // Headers
  ctx.font = `50px '${font}'`;
  ctx.fillStyle = "#b8ac84";
  ctx.textAlign = "center";

  let currentX = tableX;
  headers.forEach((header, i) => {
    if (columnWidths[i] === undefined)
      throw new Error("Column width not defined");
    ctx.fillText(
      header,
      currentX + columnWidths[i] / 2,
      currentY + rowHeight / 1.5
    );
    currentX += columnWidths[i];
  });

  // Rows
  currentY += rowHeight;
  ctx.font = `25px '${font}'`;

  teams.forEach((team, rank) => {
    currentX = tableX;
    const isFirstPlace = rank === 0;

    const rowData = [
      rank + 1,
      team.teamName,
      team.totalRankingPoints,
      team.totalKillPoints,
      team.totalPoints,
    ];

    rowData.forEach((data, i) => {
      if (columnWidths[i] === undefined)
        throw new Error("Column width not defined");
      ctx.fillStyle = isFirstPlace ? "#b8ac84" : "rgba(0, 0, 0, 0.5)";
      ctx.beginPath();
      ctx.moveTo(currentX + 10, currentY);
      ctx.lineTo(currentX + columnWidths[i] - 10, currentY);
      ctx.quadraticCurveTo(
        currentX + columnWidths[i],
        currentY,
        currentX + columnWidths[i],
        currentY + rowHeight - 10
      );
      ctx.lineTo(currentX + columnWidths[i], currentY + rowHeight - 10);
      ctx.quadraticCurveTo(
        currentX + columnWidths[i],
        currentY + rowHeight,
        currentX + columnWidths[i] - 10,
        currentY + rowHeight
      );
      ctx.lineTo(currentX + 10, currentY + rowHeight);
      ctx.quadraticCurveTo(
        currentX,
        currentY + rowHeight,
        currentX,
        currentY + rowHeight - 10
      );
      ctx.lineTo(currentX, currentY + 10);
      ctx.quadraticCurveTo(currentX, currentY, currentX + 10, currentY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = isFirstPlace ? "black" : "#ffffff";
      ctx.font = `30px '${font}'`;
      ctx.fillText(
        String(data),
        currentX + columnWidths[i] / 2,
        currentY + rowHeight / 1.5
      );
      currentX += columnWidths[i];
    });

    currentY += rowHeight + rowGap;
  });

  ctx.fillStyle = "#b8ac84";
  ctx.textAlign = "center";
  ctx.font = `bold 30px '${font}'`;
  ctx.fillText(dateString, width / 2, 1800);
  ctx.font = `bold 40px '${font}'`;
  ctx.fillText("CLARITY 2025", width / 2, 1850);

  return canvas.toBuffer("image/png");
}
