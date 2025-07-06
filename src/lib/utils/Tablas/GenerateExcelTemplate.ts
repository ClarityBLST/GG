import ExcelJS from "exceljs";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MARK: Opciones para generar plantilla de scrim
interface ScrimTemplateOptions {
  fileName: string;
  numPartidas: number;
  jugadoresPorEquipo: number;
  equipos?: number;
}

// MARK: Función para generar plantilla de scrim en formato Excel
/**
 * Genera una plantilla de scrim en formato Excel.
 * @param {ScrimTemplateOptions} options - Opciones para la plantilla.
 * @returns {Promise<void>} Promesa que se resuelve al guardar el archivo.
 */
export async function generarPlantillaScrimExcel({
  fileName = "plantilla_scrim.xlsx",
  numPartidas,
  jugadoresPorEquipo,
  equipos = 16, // Número de equipos por defecto
}: ScrimTemplateOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Plantilla Scrim");

  // #MARK: Fusionar 2 columnas para ID y Nombre de equipo.
  sheet.mergeCells(1, 1, 2, 1);
  sheet.getCell(1, 1).value = "ID Equipo";
  sheet.getCell(1, 1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF59D" }, // amarillo claro
  };
  sheet.getCell(1, 1).font = { bold: true };
  sheet.getCell(1, 1).alignment = { vertical: "middle", horizontal: "center" };
  sheet.getCell(1, 1).border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  sheet.mergeCells(1, 2, 2, 2);
  sheet.getCell(1, 2).value = "Nombre Equipo";
  sheet.getCell(1, 2).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF59D" }, // amarillo claro
  };
  sheet.getCell(1, 2).font = { bold: true };
  sheet.getCell(1, 2).alignment = { vertical: "middle", horizontal: "center" };
  sheet.getCell(1, 2).border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "medium" }, // 👈 Borde más grueso entre nombre y partida 1
  };

  let col = 3;

  // #MARK: Crear encabezados para cada partida y jugador
  for (let partida = 1; partida <= numPartidas; partida++) {
    const startCol = col;

    sheet.getRow(2).getCell(col++).value = `Posición P${partida}`;

    for (let j = 1; j <= jugadoresPorEquipo; j++) {
      sheet.getRow(2).getCell(col++).value = `Kills J${j} P${partida}`;
    }

    const endCol = col - 1;

    sheet.mergeCells(1, startCol, 1, endCol);
    sheet.getCell(1, startCol).value = `Partida ${partida}`;

    // 🔹 Estilo para fila 1 (Partida X fusionado)
    for (let i = startCol; i <= endCol; i++) {
      const cell = sheet.getRow(1).getCell(i);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFBBDEFB" }, // azul claro
      };
      cell.font = { bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: i === endCol ? "medium" : "thin" }, // 👈 Borde grueso al final del bloque
      };
    }

    // 🔸 Estilo para fila 2
    for (let i = startCol; i <= endCol; i++) {
      const cell = sheet.getRow(2).getCell(i);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" }, // gris claro
      };
      cell.font = { bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: i === endCol ? "medium" : "thin" },
      };
    }
  }

  // 🔳 Ajustar ancho automático
  sheet.columns.forEach((_, i) => {
    sheet.getColumn(i + 1).width = 18;
  });

  // 🔲 Agregar filas de equipos con bordes
  for (let i = 3; i < 3 + equipos; i++) {
    const row = sheet.getRow(i);
    for (let j = 1; j < col; j++) {
      const isFinalColumn = j === 2 || (j - 2) % (1 + jugadoresPorEquipo) === 0; // columna nombre o fin de bloque

      row.getCell(j).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: isFinalColumn ? "medium" : "thin" },
      };
    }
  }

  // ❄️ Congelar filas superiores
  sheet.views = [{ state: "frozen", ySplit: 2 }];

  // #MARK: 💾 Guardar archivo
  const templatesDir = path.resolve(__dirname, "../../templates");
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir);
  }

  const filePath = path.resolve(templatesDir, fileName);
  await workbook.xlsx.writeFile(filePath);
  console.log(`✅ Plantilla generada: ${filePath}`);
}
