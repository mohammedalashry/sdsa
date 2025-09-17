import { FixtureData } from "./fixtures.types";

export interface Referee {
  id: number;
  name: string;
  image: string;
  country: { name: string; code: string; flag: string };
  bithDate: string;
  age: number;
  matches: number;
}
export interface RefereeMatchStats {
  yellow_cards: number;
  red_cards: number;
  fixture_data: FixtureData;
}
export interface RefereeCareerStats {
  league: any;
  appearances: number;
  yellow_cards: number;
  red_cards: number;
  penalties: number;
}

export type RefereeResponse = Referee[];
export type RefereeInfoResponse = Referee;
export type RefereeMatchStatsResponse = RefereeMatchStats[]; //fixtures
export type RefereeCareerStatsResponse = RefereeCareerStats[];

