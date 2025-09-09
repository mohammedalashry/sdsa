# MongoDB Schemas for SDSA

This directory contains all MongoDB schemas for the SDSA project, designed to handle Korastats API data with optimal performance for mapping, collecting, and retrieving operations.

## 📁 Schema Structure

### Core Entity Schemas

- **`tournament.schema.ts`** - Tournament metadata and structure
- **`match.schema.ts`** - Match data with time-series optimization
- **`player.schema.ts`** - Player profiles and career data
- **`team.schema.ts`** - Team profiles and historical data

### Statistics Schemas

- **`player-stats.schema.ts`** - Individual player performance metrics
- **`team-stats.schema.ts`** - Team performance metrics

### Event Schemas

- **`match-events.schema.ts`** - Match timeline and events

### System Schemas

- **`sync-logs.schema.ts`** - Data synchronization tracking

## 🚀 Usage in Modules

### Option 1: Import Individual Models (Recommended)

```typescript
// In your module's service file
import { Models } from "../../../db/mogodb/models";

export class FixturesService {
  async getMatchById(matchId: number) {
    return await Models.Match.findOne({ korastats_id: matchId });
  }

  async createMatch(matchData: any) {
    return await Models.Match.create(matchData);
  }

  async getMatchEvents(matchId: number) {
    return await Models.MatchEvent.find({ match_id: matchId });
  }
}
```

### Option 2: Import Specific Models

```typescript
// In your module's service file
import { Match, MatchEvent, PlayerStats } from "../../../db/mogodb/models";

export class FixturesService {
  async getMatchById(matchId: number) {
    return await Match.findOne({ korastats_id: matchId });
  }

  async getMatchEvents(matchId: number) {
    return await MatchEvent.find({ match_id: matchId });
  }
}
```

### Option 3: Create Module-Specific Models

```typescript
// In your module's model file (e.g., src/modules/fixtures/fixture.model.ts)
import { Models } from "../../../db/mogodb/models";

export class FixtureModel {
  private Match = Models.Match;
  private MatchEvent = Models.MatchEvent;
  private PlayerStats = Models.PlayerStats;

  async findById(id: number) {
    return await this.Match.findOne({ korastats_id: id });
  }

  async findByTournament(tournamentId: number, season?: string) {
    const query: any = { tournament_id: tournamentId };
    if (season) query.season = season;

    return await this.Match.find(query).sort({ date: -1 });
  }

  async createMatch(matchData: any) {
    return await this.Match.create(matchData);
  }

  async updateMatch(id: number, updateData: any) {
    return await this.Match.findOneAndUpdate(
      { korastats_id: id },
      { ...updateData, updated_at: new Date() },
      { new: true },
    );
  }
}
```

## 🎯 Key Features

### 1. **Korastats Integration**

- All schemas include `korastats_id` for seamless API integration
- Sync tracking with `last_synced` and `sync_version` fields
- Data availability flags for efficient querying

### 2. **Performance Optimization**

- Strategic indexes for common query patterns
- Embedded documents for frequently accessed data
- Time-series optimization for match and stats data

### 3. **Type Safety**

- Full TypeScript interfaces for all schemas
- Proper typing for embedded documents and arrays
- Validation at the schema level

### 4. **Data Integrity**

- Unique constraints on Korastats IDs
- Required field validation
- Enum constraints for status fields

## 📊 Indexing Strategy

### Critical Indexes

```typescript
// Matches
{ korastats_id: 1 }
{ tournament_id: 1, season: 1, round: 1 }
{ date: 1, tournament_id: 1 }
{ 'teams.home.id': 1, date: 1 }
{ 'teams.away.id': 1, date: 1 }

// Player Stats
{ player_id: 1, match_date: -1 }
{ match_id: 1, player_id: 1 }
{ tournament_id: 1, season: 1, player_id: 1 }

// Team Stats
{ team_id: 1, match_date: -1 }
{ match_id: 1, team_id: 1 }

// Match Events
{ match_id: 1, minute: 1 }
{ player_id: 1, match_date: -1 }
```

## 🔄 Sync Management

### Sync Logging

```typescript
import { SyncLog } from "../../../db/mogodb/models";

// Start sync
const syncLog = await SyncLog.create({
  sync_type: "incremental",
  sync_status: "running",
  tournament_id: 123,
  started_at: new Date(),
});

// Update progress
await SyncLog.findByIdAndUpdate(syncLog._id, {
  records_processed: 100,
  records_updated: 50,
  records_created: 30,
});

// Complete sync
await SyncLog.findByIdAndUpdate(syncLog._id, {
  sync_status: "completed",
  completed_at: new Date(),
  duration_ms: Date.now() - syncLog.started_at.getTime(),
});
```

## 🎨 Best Practices

### 1. **Query Optimization**

```typescript
// Good: Use indexes
const matches = await Match.find({ tournament_id: 123 }).sort({ date: -1 }).limit(10);

// Good: Use projection for large documents
const matchSummary = await Match.findOne(
  { korastats_id: 456 },
  { teams: 1, date: 1, status: 1, quick_stats: 1 },
);
```

### 2. **Data Updates**

```typescript
// Good: Update with sync tracking
await Match.findOneAndUpdate(
  { korastats_id: 789 },
  {
    ...updateData,
    last_synced: new Date(),
    sync_version: { $inc: 1 },
  },
  { new: true },
);
```

### 3. **Error Handling**

```typescript
try {
  const match = await Match.create(matchData);
  return match;
} catch (error) {
  if (error.code === 11000) {
    // Duplicate key error (korastats_id already exists)
    return await Match.findOneAndUpdate(
      { korastats_id: matchData.korastats_id },
      matchData,
      { new: true },
    );
  }
  throw error;
}
```

## 🔧 Module Integration Examples

### Fixtures Module

```typescript
// src/modules/fixtures/fixture.model.ts
import { Models } from "../../../db/mogodb/models";

export class FixtureModel {
  async getFixturesByTournament(tournamentId: number, season?: string) {
    const query: any = { tournament_id: tournamentId };
    if (season) query.season = season;

    return await Models.Match.find(query)
      .sort({ date: -1 })
      .populate("teams.home.id", "name")
      .populate("teams.away.id", "name");
  }

  async getMatchDetails(matchId: number) {
    const [match, events, playerStats] = await Promise.all([
      Models.Match.findOne({ korastats_id: matchId }),
      Models.MatchEvent.find({ match_id: matchId }).sort({ minute: 1 }),
      Models.PlayerStats.find({ match_id: matchId }),
    ]);

    return { match, events, playerStats };
  }
}
```

### Teams Module

```typescript
// src/modules/teams/teams.model.ts
import { Models } from "../../../db/mogodb/models";

export class TeamsModel {
  async getTeamById(teamId: number) {
    return await Models.Team.findOne({ korastats_id: teamId });
  }

  async getTeamStats(teamId: number, season?: string) {
    const query: any = { team_id: teamId };
    if (season) query.season = season;

    return await Models.TeamStats.find(query).sort({ match_date: -1 }).limit(10);
  }

  async getTeamPlayers(teamId: number) {
    const team = await Models.Team.findOne({ korastats_id: teamId });
    return team?.current_squad || [];
  }
}
```

This schema design provides the perfect foundation for efficient data management in the SDSA project! 🚀

