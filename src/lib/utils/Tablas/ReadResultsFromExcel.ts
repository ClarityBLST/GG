import ExcelJS from "exceljs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MARK: Función para leer resultados de scrim desde un archivo Excel
/**
 * Lee los resultados de un scrim desde un archivo Excel y los guarda en formato JSON.
 * @param {ReadScrimOptions} options - Opciones para leer los resultados.
 * @returns {Promise<void>} Promesa que se resuelve al guardar el archivo JSON.
 */
export async function leerResultadosScrimExcel({
  fileName,
  numPartidas,
  jugadoresPorEquipo,
  equipos = 16,
}: ReadScrimOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  const filePath = path.resolve(__dirname, "../../results_test", fileName);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ El archivo ${filePath} no existe`);
    return;
  }

  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.getWorksheet(1);

  if (!sheet) {
    console.error(`❌ La hoja de Excel no existe en el archivo: ${filePath}`);
    return;
  }

  console.log(`📄 Leyendo resultados de: ${filePath}`);

  const resultados: any[] = [];

  // # MARK: For para cada fila de equipo
  for (let rowIndex = 3; rowIndex < 3 + equipos; rowIndex++) {
    const row = sheet.getRow(rowIndex);
    const idEquipo = row.getCell(1).value?.toString() ?? "";
    if (!idEquipo) {
      console.warn(`⚠️ Fila ${rowIndex} sin ID de equipo, omitiendo`);
      continue;
    }
    const nombreEquipo = row.getCell(2).value?.toString() ?? "";
    if (!nombreEquipo) {
      console.warn(`⚠️ Fila ${rowIndex} sin nombre de equipo, omitiendo`);
      continue;
    }

    //##MARK: For para cada jugador del equipo
    const jugadores: string[] = [];
    for (let j = 0; j < jugadoresPorEquipo; j++) {
      jugadores.push(`Jugador ${j + 1}`);
    }

    const equipoData = {
      idEquipo,
      nombreEquipo,
      jugadores,
      partidas: [] as any[],
    };

    let col = 3;
    //##MARK: For para cada partida
    for (let partida = 1; partida <= numPartidas; partida++) {
      const posicion = Number(row.getCell(col++).value) ?? "";
      if (!posicion) {
        console.warn(
          `⚠️ Fila ${rowIndex}, Partida ${partida} sin posición, omitiendo`
        );
        continue;
      }

      const kills: number[] = [];

      //##MARK: For para kills de cada jugador en la partida
      for (let j = 0; j < jugadoresPorEquipo; j++) {
        const rawKill = row.getCell(col++).value;
        const parsed = Number(rawKill);
        kills.push(isNaN(parsed) ? 0 : parsed); // si no es número, lo convierte a 0
      }

      equipoData.partidas.push({
        partida,
        posicion,
        kills,
      });
    }

    resultados.push(equipoData);
  }

  // MARK: Guardar resultados en JSON
  console.log("📦 Guardando resultados en JSON...");
  const jsonFolder = path.resolve(__dirname, "../../results_test/json");
  const jsonFileName =
    path.basename(fileName, path.extname(fileName)) + ".json";
  const jsonFilePath = path.join(jsonFolder, jsonFileName);

  // Asegurarse que la carpeta exista
  if (!fs.existsSync(jsonFolder)) {
    fs.mkdirSync(jsonFolder, { recursive: true });
  }

  // Guardar el JSON
  fs.writeFileSync(jsonFilePath, JSON.stringify(resultados, null, 2), "utf-8");

  console.log(`✅ Resultados guardados en: ${jsonFilePath}`);
}
