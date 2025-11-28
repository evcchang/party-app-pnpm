import { TEAMS } from "../app/constants/teams";

export function getTeamColor(teamName: string): string {
  return TEAMS.find((t) => t.name === teamName)?.color ?? "#6b7280"; // gray-500 fallback
}