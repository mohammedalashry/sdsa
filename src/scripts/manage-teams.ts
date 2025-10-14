// src/scripts/manage-teams.ts
import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import { TeamNew } from "@/mapper/teamNew";
import { TeamDataService } from "@/syncer/team-data.service";
import { Models } from "@/db/mogodb/models";
import { KorastatsMongoService } from "@/db/mogodb/connection";

function parseArgs() {
  const [, , command = "", ...rest] = process.argv;
  const options: Record<string, any> = {};
  for (const arg of rest) {
    const [k, v] = arg.split("=");
    const key = k.replace(/^--/, "");
    if (v === undefined) options[key] = true;
    else if (/^\d+$/.test(v)) options[key] = Number(v);
    else if (v.includes(",")) options[key] = v.split(",").map((n) => Number(n));
    else options[key] = v;
  }
  return { command, options };
}

async function main() {
  const { command, options } = parseArgs();

  const korastats = new KorastatsService();
  const mapper = new TeamNew();
  const service = new TeamDataService(korastats, mapper);
  const mongo = new KorastatsMongoService();

  await mongo.connect();

  switch (command) {
    case "clear": {
      const beforeDate = options.beforeDate ? new Date(options.beforeDate) : undefined;
      const afterDate = options.afterDate ? new Date(options.afterDate) : undefined;
      const excludeIds: number[] = options.excludeIds || [];
      const includeIds: number[] = options.includeIds || [];
      const tournamentId = options.tournamentId
        ? Number(options.tournamentId)
        : undefined;
      const res = await service.clearTeams({
        beforeDate,
        afterDate,
        excludeIds,
        includeIds,
        tournamentId,
      });
      console.log(`Cleared teams: ${res.deletedCount}`);
      break;
    }
    case "sync": {
      const tournamentId = Number(options.tournamentId || options.tid || 0);
      if (tournamentId) {
        const res = await service.syncTournamentTeams(tournamentId, (p) => {
          if (p.phase === "mapping" || p.phase === "storing") {
            console.log(`${p.phase}: ${p.current}/${p.total} ${p.currentTeam || ""}`);
          }
        });
        console.log(`Done. processed=${res.teamsProcessed} errors=${res.errors.length}`);
      } else {
        // Sync all tournaments: get tournament list then iterate unique teams by id
        const tournamentsResp = await korastats.getTournamentList();
        const tournaments = tournamentsResp?.data || [];
        const uniqueTeamIds = new Set<number>();
        let processed = 0;
        let errors: string[] = [];
        for (const t of tournaments) {
          try {
            const teamListResp = await korastats.getTournamentTeamList(t.id);
            const teamList = teamListResp?.data?.teams || [];
            for (const team of teamList) uniqueTeamIds.add(team.id);
          } catch (e: any) {
            console.warn(`Skip tournament ${t.id}: ${e.message}`);
          }
        }
        const ids = Array.from(uniqueTeamIds);
        console.log(`Found ${ids.length} unique teams across tournaments. Syncing...`);
        for (const t of tournaments) {
          try {
            const res = await service.syncTournamentTeams(t.id || 0, (p) => {
              if (p.phase === "mapping" || p.phase === "storing") {
                console.log(`${p.phase}: ${p.current}/${p.total} ${p.currentTeam || ""}`);
              }
            });
            processed += res.teamsProcessed;
            errors = errors.concat(res.errors);
            console.log(`Done. processed=${processed} errors=${errors.length}`);
          } catch (e: any) {
            console.warn(`Skip tournament ${t.id}: ${e.message}`);
          }
        }
      }
      break;
    }
    case "sync-specific": {
      const tournamentId = Number(options.tournamentId || options.tid);
      const ids: number[] = options.ids || [];
      if (!tournamentId || !ids.length)
        throw new Error("--tournamentId and --ids are required");
      const res = await service.syncSpecificTeams(ids, tournamentId, (p) => {
        console.log(`${p.phase}: ${p.current}/${p.total} ${p.currentTeam || ""}`);
      });
      console.log(`Done. processed=${res.teamsProcessed} errors=${res.errors.length}`);
      break;
    }
    default:
      console.log(
        "Usage: ts-node src/scripts/manage-teams.ts <clear|sync|sync-specific> --tournamentId=840 [--ids=1,2,3]",
      );
      process.exit(1);
  }
  await mongo.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

