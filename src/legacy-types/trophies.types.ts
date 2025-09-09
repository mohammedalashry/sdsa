import { League } from "./leagues.types";
import { Team } from "./teams.types";

export interface TrophiesData {
  league: string;
  country: string;
  season: string;
  place: string;
}

export interface TrophiesWithTeam {
  league: League;
  season: string;
  seasonInt: number;
  team: Team;
}

export type TrophiesDataResponse = TrophiesData[];
export type TrophiesWithTeamResponse = TrophiesWithTeam[];
