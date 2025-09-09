import { PlayerData } from "./players.types";
import { Team } from "./teams.types";

export interface TransferData {
  player: PlayerData;
  update: string;
  transfers: Transfer[];
}

export interface Transfer {
  date: string;
  type: string | null;
  teams: {
    in: Team;
    out: Team;
  };
}

export type TransferDataResponse = TransferData[];
