export interface TeamAttacking {
  goals_per_game: number;
  penalty_goals: string;
  free_kick_goals: string;
  goals_from_inside_the_box: string;
  goals_from_outside_the_box: string;
  left_foot_goals: number;
  right_foot_goals: number;
  headed_goals: number;
  big_chances_per_game: number;
  big_chances_missed_per_game: number;
  total_shots_per_game: number;
  shots_on_target_per_game: number;
  shots_off_target_per_game: number;
  blocked_shots_per_game: number;
  successful_dribbles_per_game: number;
  corners_per_game: number;
  free_kicks_per_game: number;
  hit_woodwork: number;
  counter_attacks: number;
}
export interface TeamPasses {
  ball_possession: string;
  accurate_per_game: string;
  acc_own_half: string;
  acc_opposition_half: string;
  acc_long_balls: string;
  acc_crosses: string;
}
export interface TeamDefending {
  clean_sheets: number;
  goals_conceded_per_game: number;
  tackles_per_game: number;
  interceptions_per_game: number;
  clearances_per_game: number;
  saves_per_game: number;
  balls_recovered_per_game: number;
  errors_leading_to_shot: number;
  errors_leading_to_goal: number;
  penalties_committed: number;
  penalty_goals_conceded: number;
  clearance_off_line: number;
  last_man_tackle: number;
}
export interface TeamOther {
  duels_won_per_game: string;
  ground_duels_won: string;
  aerial_duels_won: string;
  possession_lost_per_game: number;
  throw_ins_per_game: number;
  goal_kicks_per_game: number;
  offsides_per_game: number;
  fouls_per_game: number;
  yellow_cards_per_game: number;
  red_cards: number;
}

