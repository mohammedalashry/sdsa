import { CoachData } from "./players.types";
import { TransferData } from "./transfers.types";
import { League } from "./leagues.types";

export interface Team {
  id: number;
  name: string;
  code: string | null;
  country: string;
  founded: number | null;
  national: boolean;
  logo: string;
}

export interface TeamVenue {
  id: number | null;
  name: string | null;
  address: string | null;
  city: string | null;
  capacity: number | null;
  surface: string | null;
  image: string | null;
}

export interface TeamData {
  team: Team;
  venue: TeamVenue;
}

export type TeamDataResponse = TeamData[];

export interface TeamsTrophiesData {
  league: string;
  country: string;
  season: string;
}

export interface TeamInfo {
  team: Team;
  venue: TeamVenue;
  coach: CoachData[];
  transfers: TransferData[];
  totalPlayers: number;
  foreignPlayers: number;
  averagePlayerAge: number;
  clubMarketValue: string;
  currentLeagues: League[];
  trophies: TeamsTrophiesData[];
}
