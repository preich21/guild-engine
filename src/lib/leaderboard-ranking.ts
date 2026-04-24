export const rankLeaderboardEntries = <T extends { totalPoints: number }>(entries: T[]) =>
  entries.map((entry, index) => {
    let rank = 1;

    for (let i = index - 1; i >= 0; i--) {
      const previousEntry = entries[i];
      if (previousEntry == undefined || previousEntry.totalPoints !== entry.totalPoints) {
        rank = i + 2;
        break;
      }
    }

    return {
      ...entry,
      rank,
    };
  });
