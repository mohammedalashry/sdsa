import { FixtureData } from "./fixtures.types";
import { TrophiesTeamData } from "./players.types";

export interface CoachData {
  id: number;
  name: string;
  photo: string;

  firstname: string;
  lastname: string;
  age: number | null;
  birth: {
    date: string | null;
    place: string | null;
    country: string | null;
  };
  nationality: { name: string; code: string; flag: string };
  height: string | null;
  weight: string | null;
  team: { id: number; name: string; logo: string };
}
export interface CoachInfo {
  id: number;
  name: string;
  photo: string;
  firstname: string;
  lastname: string;
  age: number | null;
  birth: { date: string | null; place: string | null; country: string | null };
  nationality: { name: string; code: string; flag: string };
  height: string | null;
  weight: string | null;
  team: { id: number; name: string; logo: string };
  matches: number;
  prefferedFormation: string;
  currentTeam: { id: number; name: string; logo: string };
  trophies: any[];
}
export interface CoachCareer {
  team: { id: number; name: string; logo: string };
  start: string;
  end?: string;
}
export interface CoachCareerStats {
  league: any | null;
  matches: number;
  wins: number;
  draws: number;
  loses: number;
  points: number;
  points_per_game: number;
}
export interface CoachMatchStats {
  yellow_cards: number;
  red_cards: number;
  fixture_data: FixtureData;
}
export interface CoachPerformance {
  winPercentage: number;
  drawPercentage: number;
  losePercentage: number;
}
export type CoachDataResponse = CoachData[];
export type CoachCareerStatsResponse = CoachCareerStats[];
export type CoachInfoResponse = CoachInfo;
export type CoachCareerResponse = CoachCareer[];
export type CoachTrophiesResponse = TrophiesTeamData[];
export type CoachMatchStatsResponse = CoachMatchStats[];
export type CoachPerformanceResponse = CoachPerformance;

