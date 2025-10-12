export function mapFormationToText(formation: string): string {
  formation = formation.split("1-")?.[1] || formation;
  let validNum = (num: string) =>
    num === "1" ||
    num === "2" ||
    num === "3" ||
    num === "4" ||
    num === "5" ||
    num === "6";
  let validFormation: string[] = formation.split("").filter((a) => validNum(a));
  let result = validFormation[0];
  for (let i = 1; i < validFormation.length; i++) {
    result = result.concat("-", validFormation[i]);
  }
  return result;
}

/**
 * Enhanced method to assign grid positions to all players in a team
 * This method groups players by line and assigns positions incrementally
 */
export function assignGridPositionsToTeam(
  players: any[],
  formation: string,
): { player: any; grid: string }[] {
  const formationParts = formation.split("-").map((part) => parseInt(part));
  const normalizedFormation = formation.trim();

  if (!isValidFormation(normalizedFormation)) {
    // Fallback to basic positioning
    return players.map((player, index) => ({
      player,
      grid: getBasicPositionGrid(
        player?.position?.name ||
          player?.position?.primary?.name ||
          player?.position?.secondary?.name ||
          "",
      ),
    }));
  }

  // Group players by their line
  const playersByLine = groupPlayersByLine(players);

  // Assign grid positions based on formation
  const playersWithGrid = assignPositionsByFormation(playersByLine, formationParts);

  return playersWithGrid;
}

function groupPlayersByLine(players: any[]): {
  goalkeeper: any[];
  defense: any[];
  midfield: any[];
  forward: any[];
} {
  const groups = {
    goalkeeper: [] as any[],
    defense: [] as any[],
    midfield: [] as any[],
    forward: [] as any[],
  };

  players.forEach((player) => {
    const position = (
      player?.position?.name ||
      player?.position?.primary?.name ||
      player?.position?.secondary?.name ||
      ""
    )
      .trim()
      .toUpperCase();

    if (position === "GK") {
      groups.goalkeeper.push(player);
    } else if (isDefensePosition(position)) {
      groups.defense.push(player);
    } else if (isMidfieldPosition(position)) {
      groups.midfield.push(player);
    } else if (isForwardPosition(position)) {
      groups.forward.push(player);
    } else {
      // Unknown position, add to midfield as fallback
      groups.midfield.push(player);
    }
  });

  return groups;
}

function assignPositionsByFormation(
  playersByLine: any,
  formationParts: number[],
): { player: any; grid: string }[] {
  const result: { player: any; grid: string }[] = [];
  let currentY = 1; // Start from y=1

  // Assign goalkeeper (always at 1:1)
  if (playersByLine.goalkeeper.length > 0) {
    result.push({
      player: playersByLine.goalkeeper[0],
      grid: "1:1",
    });
  }

  // Assign defense line (Row 2)
  if (formationParts.length >= 1) {
    const defenderCount = formationParts[0];
    const sortedDefenders = sortDefendersByPosition(playersByLine.defense);

    sortedDefenders.slice(0, defenderCount).forEach((player, index) => {
      result.push({
        player,
        grid: `2:${index + 1}`,
      });
    });
  }

  // Assign midfield line (Row 3)
  if (formationParts.length >= 2) {
    const midfielderCount = formationParts[1];
    const sortedMidfielders = sortMidfieldersByPosition(playersByLine.midfield);

    sortedMidfielders.slice(0, midfielderCount).forEach((player, index) => {
      result.push({
        player,
        grid: `3:${index + 1}`,
      });
    });
  }

  // Assign forward line (Row 4)
  if (formationParts.length >= 3) {
    const forwardCount = formationParts[2];
    const sortedForwards = sortForwardsByPosition(playersByLine.forward);

    sortedForwards.slice(0, forwardCount).forEach((player, index) => {
      result.push({
        player,
        grid: `4:${index + 1}`,
      });
    });
  }

  return result;
}

function sortDefendersByPosition(defenders: any[]): any[] {
  // Sort defenders: LB, CB, CB, RB (left to right)
  const positionOrder = ["LB", "LWB", "CB-L", "CB", "CB-R", "RB", "RWB"];

  return defenders.sort((a, b) => {
    const posA = a?.position?.name?.trim().toUpperCase() || "";
    const posB = b?.position?.name?.trim().toUpperCase() || "";

    const indexA = positionOrder.indexOf(posA);
    const indexB = positionOrder.indexOf(posB);

    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });
}

function sortMidfieldersByPosition(midfielders: any[]): any[] {
  // Sort midfielders: LM, CM, CM, RM (left to right)
  const positionOrder = ["LM", "CM-L", "DM-L", "CM", "DM", "AM", "CM-R", "DM-R", "RM"];

  return midfielders.sort((a, b) => {
    const posA = a?.position?.name?.trim().toUpperCase() || "";
    const posB = b?.position?.name?.trim().toUpperCase() || "";

    const indexA = positionOrder.indexOf(posA);
    const indexB = positionOrder.indexOf(posB);

    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });
}

function sortForwardsByPosition(forwards: any[]): any[] {
  // Sort forwards: LW, ST, RW (left to right)
  const positionOrder = ["LW", "LF", "ST-L", "ST", "CF", "ST-R", "RW", "RF"];

  return forwards.sort((a, b) => {
    const posA = a?.position?.name?.trim().toUpperCase() || "";
    const posB = b?.position?.name?.trim().toUpperCase() || "";

    const indexA = positionOrder.indexOf(posA);
    const indexB = positionOrder.indexOf(posB);

    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });
}

function getBasicPositionGrid(position: string): string {
  // Fallback basic position mapping
  const positionGridMap: Record<string, string> = {
    GK: "1:1", // Fixed: GK should be at 1:1, not 1:3
    CB: "2:3",
    LB: "2:1",
    RB: "2:5",
    CM: "3:3",
    LM: "3:1",
    RM: "3:5",
    ST: "4:3",
    LW: "4:1",
    RW: "4:5",
  };

  return positionGridMap[position] || "3:3";
}

function isValidFormation(formation: string): boolean {
  // Check if formation follows pattern like "4-3-3", "3-5-2", etc.
  const formationPattern = /^\d+-\d+(-\d+)?$/;
  return formationPattern.test(formation);
}

function isDefensePosition(position: string): boolean {
  const defensePositions = [
    "CB",
    "LB",
    "RB",
    "LWB",
    "RWB",
    "CB-L",
    "CB-R",
    "CENTRE BACK",
    "LEFT BACK",
    "RIGHT BACK",
  ];
  return defensePositions.includes(position);
}

function isMidfieldPosition(position: string): boolean {
  const midfieldPositions = [
    "DM",
    "CM",
    "AM",
    "LM",
    "RM",
    "DM-L",
    "DM-R",
    "CM-L",
    "CM-R",
    "AM-L",
    "AM-R",
    "DEFENSIVE MIDFIELDER",
    "CENTRAL MIDFIELDER",
    "ATTACKING MIDFIELDER",
    "LEFT MIDFIELDER",
    "RIGHT MIDFIELDER",
  ];
  return midfieldPositions.includes(position);
}

function isForwardPosition(position: string): boolean {
  const forwardPositions = [
    "CF",
    "ST",
    "LW",
    "RW",
    "LF",
    "RF",
    "ST-L",
    "ST-R",
    "CENTRE FORWARD",
    "LEFT FORWARD",
    "RIGHT FORWARD",
    "LEFT WINGER",
    "RIGHT WINGER",
  ];
  return forwardPositions.includes(position);
}

