export type DeveloperUser = {
  id: string; name: string; email: string; emailVerified: number;
  createdAt: number; updatedAt: number; lastSaveAt: string | null;
  saveVersion: number; xp: number; lessons: number; puzzleAttempts: number;
  games: number; activeSessions: number; isOwner: boolean;
};
export type DeveloperDetail = DeveloperUser & {
  correctPuzzles: number; analyses: number; puzzleRating: number;
  goal: string | null; chesscom: string | null; lichess: string | null;
  progressBytes: number;
};
export type DeveloperOverview = {
  totalAccounts: number; newAccounts7d: number; savedProfiles: number;
  recentSaves: number; activeSessions: number; progressBytes: number;
  completedLessons: number; puzzleAttempts: number; savedGames: number;
  signups: { day: string; count: number }[];
  checkedAt: string;
};
export type DeveloperAudit = {
  id: string; actorId: string; targetId: string; action: string; createdAt: string;
  targetName: string | null;
};
