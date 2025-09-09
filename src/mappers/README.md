# Mapper Layer for SDSA

This directory contains the mapper layer that transforms Korastats API responses into MongoDB schemas for efficient data storage and retrieval.

## 📁 Structure

### Core Mappers

- **`korastats-to-mongo.mapper.ts`** - Core mapping functions from Korastats to MongoDB schemas
- **`mapper.service.ts`** - Service to orchestrate mapping operations with database storage

### Legacy Mappers

- **`fixture.mapper.ts`** - Legacy fixture mapping (Django format)
- **`team.mapper.ts`** - Legacy team mapping (Django format)
- **`player.mapper.ts`** - Legacy player mapping (Django format)
- **`league.mapper.ts`** - Legacy league mapping (Django format)
- **`standings.mapper.ts`** - Legacy standings mapping (Django format)
- **`highlights.mapper.ts`** - Legacy highlights mapping (Django format)
- **`fixture-detail.mapper.ts`** - Detailed fixture mapping
- **`team-comprehensive.mapper.ts`** - Comprehensive team mapping

### Utilities

- **`default-values.ts`** - Default values for mapping
- **`team-helpers.ts`** - Helper functions for team operations

## 🚀 Usage

### Basic Mapping Operations

```typescript
import { MapperService } from "../mappers";

const mapperService = new MapperService();

// Map and store a tournament
const tournament = await mapperService.mapAndStoreTournament(123, "2024");

// Map and store a match
const match = await mapperService.mapAndStoreMatch(456, 123, "2024");

// Map and store a player
const player = await mapperService.mapAndStorePlayer(789);

// Map and store a team
const team = await mapperService.mapAndStoreTeam(101);
```

### Bulk Operations

```typescript
// Map all matches for a tournament
const matches = await mapperService.mapAndStoreTournamentMatches(123, "2024");

// Map detailed match data (events, stats, etc.)
const matchDetails = await mapperService.mapAndStoreMatchDetails(456);

// Complete tournament mapping (tournament + matches + teams + players)
const completeData = await mapperService.mapAndStoreTournamentComplete(123, "2024");
```

### Direct Mapping (without storage)

```typescript
import { KorastatsToMongoMapper } from "../mappers";

// Map Korastats data to MongoDB schema without storing
const mongoTournament = KorastatsToMongoMapper.mapTournament(korastatsData, "2024");
const mongoMatch = KorastatsToMongoMapper.mapMatch(korastatsMatch, 123, "2024");
const mongoPlayer = KorastatsToMongoMapper.mapPlayer(korastatsPlayer);
```

## 🎯 Mapping Strategy

### 1. **Data Transformation**

- **Korastats API Response** → **MongoDB Schema**
- Handles data type conversions (strings to dates, numbers, etc.)
- Maps nested objects to embedded documents
- Preserves Korastats IDs for reference

### 2. **Error Handling**

- Graceful handling of missing or invalid data
- Comprehensive logging for debugging
- Fallback values for optional fields
- Validation of required fields

### 3. **Performance Optimization**

- Batch processing for multiple records
- Rate limiting to respect API limits
- Efficient database operations (upsert, bulk insert)
- Memory-conscious processing

### 4. **Sync Management**

- Version tracking for data updates
- Sync logging for audit trails
- Incremental vs full sync support
- Error tracking and reporting

## 📊 Supported Mappings

### Tournament Mapping

```typescript
// Maps: KorastatsTournamentResponse → ITournament
const tournament = await mapperService.mapAndStoreTournament(tournamentId, season);
```

**Maps:**

- Tournament metadata (name, season, country, organizer)
- Tournament structure (stages, groups, teams)
- Status and dates
- Sync tracking

### Match Mapping

```typescript
// Maps: KorastatsMatchListResponse + KorastatsMatchSummaryResponse → IMatch
const match = await mapperService.mapAndStoreMatch(matchId, tournamentId, season);
```

**Maps:**

- Match metadata (date, status, round)
- Teams (home/away with scores)
- Venue information
- Officials (referee, assistants)
- Match phases and quick stats
- Data availability flags

### Player Mapping

```typescript
// Maps: KorastatsPlayerInfoResponse → IPlayer
const player = await mapperService.mapAndStorePlayer(playerId);
```

**Maps:**

- Personal info (name, age, nationality)
- Physical attributes (height, weight, preferred foot)
- Position data (primary/secondary)
- Current team and career summary
- Status and media

### Team Mapping

```typescript
// Maps: KorastatsTeamInfoResponse → ITeam
const team = await mapperService.mapAndStoreTeam(teamId);
```

**Maps:**

- Team info (name, country, city)
- Club details (logo, founded year)
- Stadium information
- Current squad and coach
- Stats summary

### Statistics Mapping

```typescript
// Maps: KorastatsMatchPlayersStatsResponse → IPlayerStats[]
const playerStats = await mapperService.mapAndStoreMatchDetails(matchId);
```

**Maps:**

- Individual player performance metrics
- Team performance statistics
- Match events and timeline
- Goalkeeper-specific stats

## 🔄 Sync Operations

### Full Sync

```typescript
// Complete tournament sync (all data)
const result = await mapperService.mapAndStoreTournamentComplete(tournamentId, season);
```

### Incremental Sync

```typescript
// Update specific records
const match = await mapperService.mapAndStoreMatch(matchId, tournamentId, season);
```

### Manual Sync

```typescript
// Sync specific data points
const player = await mapperService.mapAndStorePlayer(playerId);
const team = await mapperService.mapAndStoreTeam(teamId);
```

## 📈 Performance Features

### 1. **Batch Processing**

- Processes multiple records in batches
- Configurable batch sizes
- Rate limiting between batches
- Memory-efficient processing

### 2. **Database Optimization**

- Uses upsert operations (update or insert)
- Bulk insert for multiple records
- Efficient queries with proper indexing
- Connection pooling

### 3. **Error Recovery**

- Continues processing on individual failures
- Comprehensive error logging
- Retry mechanisms for transient failures
- Graceful degradation

### 4. **Monitoring**

- Sync log tracking
- Performance metrics
- Error reporting
- Progress indicators

## 🛠️ Configuration

### Environment Variables

```bash
# Korastats API
KORASTATS_API_ENDPOINT=https://korastats.pro/pro/api.php
KORASTATS_API_KEY=your_api_key

# MongoDB
MONGODB_URI=mongodb://localhost:27017/sdsa

# Rate Limiting
KORASTATS_RATE_LIMIT=1000  # requests per minute
BATCH_SIZE=10              # records per batch
```

### Customization

```typescript
// Custom batch size
const matches = await mapperService.mapAndStoreTournamentMatches(
  tournamentId,
  season,
  undefined,
  undefined,
  undefined,
  { batchSize: 20 },
);

// Custom error handling
try {
  const result = await mapperService.mapAndStoreTournamentComplete(tournamentId, season);
} catch (error) {
  console.error("Sync failed:", error);
  // Handle error appropriately
}
```

## 🔍 Debugging

### Logging

```typescript
// Enable detailed logging
console.log("🔄 Mapping tournament", tournamentId);
console.log("✅ Mapping completed successfully");
console.log("❌ Mapping failed:", error);
```

### Sync Logs

```typescript
// Check sync status
const syncLogs = await Models.SyncLog.find({
  tournament_id: tournamentId,
}).sort({ started_at: -1 });

console.log("Last sync:", syncLogs[0]);
```

### Data Validation

```typescript
// Validate mapped data
const tournament = await Models.Tournament.findOne({ korastats_id: tournamentId });
console.log("Tournament data:", {
  name: tournament.name,
  season: tournament.season,
  status: tournament.status,
  last_synced: tournament.last_synced,
});
```

## 🚀 Best Practices

### 1. **Error Handling**

- Always wrap mapping operations in try-catch
- Log errors with context
- Implement retry logic for transient failures
- Use sync logs for audit trails

### 2. **Performance**

- Use batch operations for multiple records
- Implement rate limiting
- Monitor memory usage
- Use appropriate batch sizes

### 3. **Data Integrity**

- Validate required fields
- Handle missing data gracefully
- Use transactions for related data
- Implement data versioning

### 4. **Monitoring**

- Track sync performance
- Monitor error rates
- Set up alerts for failures
- Regular data quality checks

This mapper layer provides a robust foundation for transforming Korastats API data into our optimized MongoDB schemas! 🎯

