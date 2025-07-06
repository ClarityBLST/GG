import ExcelJS from "exceljs";

export interface ReadScrimOptions {
  buffer: ArrayBuffer;
  numPartidas: number;
  jugadoresPorEquipo: number;
  equipos?: number;
}

export async function leerResultadosScrimExcel({
  buffer,
  numPartidas,
  jugadoresPorEquipo,
  equipos = 16,
}: ReadScrimOptions): Promise<any[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer); // ✅ FUNCIONA con ArrayBuffer directamente

  const sheet = workbook.getWorksheet(1);
  if (!sheet) throw new Error("❌ La hoja de Excel no existe.");

  const resultados: any[] = [];

  for (let rowIndex = 3; rowIndex < 3 + equipos; rowIndex++) {
    const row = sheet.getRow(rowIndex);
    const idEquipo = row.getCell(1).value?.toString() ?? "";
    const nombreEquipo = row.getCell(2).value?.toString() ?? "";
    if (!idEquipo || !nombreEquipo) continue;

    const jugadores = Array.from(
      { length: jugadoresPorEquipo },
      (_, i) => `Jugador ${i + 1}`
    );

    const partidas = [];
    let col = 3;

    for (let p = 1; p <= numPartidas; p++) {
      const posicion = Number(row.getCell(col++).value) || 0;
      if (!posicion) continue;

      const kills = [];
      for (let j = 0; j < jugadoresPorEquipo; j++) {
        const val = Number(row.getCell(col++).value);
        kills.push(isNaN(val) ? 0 : val);
      }

      partidas.push({
        matchNumber: p,
        teamPosition: posicion,
        teamKills: kills,
      });
    }

    resultados.push({
      teamId: idEquipo,
      teamName: nombreEquipo,
      players: jugadores,
      matches: partidas,
    });
  }

  return resultados;
}
