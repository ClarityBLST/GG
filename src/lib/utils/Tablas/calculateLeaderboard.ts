/**
 *  Calculates the leaderboard for a scrim based on team results.
 *  Teams are ranked by total points, which are calculated from their positions in matches and kills
 * @param teams Array of team results from the scrim
 * @returns {Promise<TeamWithPoints>} Array of teams with their calculated points and ranks
 */
export async function calculateLeaderboard(
  teams: TeamResult[]
): Promise<TeamWithPoints[]> {
  //#MARK: Puntos por posición 1 y kills
  const FirstPlacePoints = 23;
  const eachKillPoints = 1;

  //#MARK: Recorrer equipos y calcular puntos
  const teamsWithPoints = teams.map((team) => {
    let totalRankingPoints = 0;
    let totalKillPoints = 0;

    // Recorrer cada partida del equipo
    for (const match of team.matches) {
      const pos = match.teamPosition;

      // Calcular puntos de ranking según la posición
      if (pos === 1) totalRankingPoints += FirstPlacePoints;
      else if (pos === 2) totalRankingPoints += 17;
      else if (pos === 3) totalRankingPoints += 14;
      else if (pos === 4) totalRankingPoints += 11;
      else if (pos === 5) totalRankingPoints += 9;
      // Si la posición es 6 o más, no se suman puntos de ranking

      // Calcular puntos de kills
      totalKillPoints +=
        match.teamKills.reduce((a, b) => a + b, 0) * eachKillPoints;
    }

    //#MARK: Calcular puntos totales de cada jugador
    const players: PlayerWithKills[] = team.players.map((name, i) => ({
      name,
      totalKills: team.matches.reduce(
        (sum, m) => sum + (m.teamKills[i] || 0),
        0
      ),
    }));

    // Retornar el equipo con sus puntos y jugadores
    return {
      teamId: team.teamId,
      teamName: team.teamName,
      players,
      totalRankingPoints,
      totalKillPoints,
      totalPoints: totalRankingPoints + totalKillPoints,
      rank: 0, // Se llenará después
    };
  });

  //#MARK: Ordenar por puntos totales y asignar rank
  teamsWithPoints.sort((a, b) => b.totalPoints - a.totalPoints);
  teamsWithPoints.forEach((team, index) => {
    team.rank = index + 1;
  });

  return teamsWithPoints;
}
