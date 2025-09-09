-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('agent', 'client', 'admin', 'superAdmin');

-- CreateEnum
CREATE TYPE "public"."EmailType" AS ENUM ('personal', 'work');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "password" TEXT,
    "last_login" TIMESTAMP(3),
    "is_superuser" BOOLEAN NOT NULL DEFAULT false,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "is_staff" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "date_joined" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email_type" "public"."EmailType" NOT NULL,
    "phonenumber" TEXT,
    "otp" TEXT,
    "otp_expiry" TIMESTAMP(3),
    "company_name" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'client',
    "purpose" TEXT NOT NULL,
    "terms_and_conditions" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT NOT NULL DEFAULT '',
    "twitter_link" TEXT NOT NULL DEFAULT '',
    "dob" TIMESTAMP(3),
    "address" TEXT NOT NULL DEFAULT '',
    "is_verified" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "change_password" BOOLEAN NOT NULL DEFAULT false,
    "last_request_at" TIMESTAMP(3),
    "country_code" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "rotated_from_id" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contacts" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contact_number" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "handled_by_id" INTEGER,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."team_follows" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "team" JSONB,

    CONSTRAINT "team_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_statistics" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "active_count" INTEGER NOT NULL DEFAULT 0,
    "pending_count" INTEGER NOT NULL DEFAULT 0,
    "deactivated_count" INTEGER NOT NULL DEFAULT 0,
    "deleted_count" INTEGER NOT NULL DEFAULT 0,
    "total_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_football_leagues" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "logo" TEXT NOT NULL,
    "api_id" INTEGER NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "api_football_leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_football_seasons" (
    "id" SERIAL NOT NULL,
    "league_id" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "api_football_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_football_teams" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "api_id" INTEGER NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "api_football_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_football_players" (
    "id" SERIAL NOT NULL,
    "api_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "api_football_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_football_coaches" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "api_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "api_football_coaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_football_fixtures" (
    "id" SERIAL NOT NULL,
    "season_id" INTEGER NOT NULL,
    "home_team_id" INTEGER NOT NULL,
    "away_team_id" INTEGER NOT NULL,
    "api_id" INTEGER NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "api_football_fixtures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_fixture_highlights" (
    "id" SERIAL NOT NULL,
    "fixture_id" INTEGER NOT NULL,
    "host" TEXT NOT NULL DEFAULT 'youtube',
    "fixture_url" TEXT NOT NULL,

    CONSTRAINT "api_fixture_highlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_ApiFootballSeasonToApiFootballTeam" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ApiFootballSeasonToApiFootballTeam_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_ApiFootballPlayerToApiFootballSeason" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ApiFootballPlayerToApiFootballSeason_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_ApiFootballPlayerToApiFootballTeam" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ApiFootballPlayerToApiFootballTeam_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_is_staff_last_request_at_idx" ON "public"."users"("is_staff", "last_request_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "public"."refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_token_hash_idx" ON "public"."refresh_tokens"("user_id", "token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "team_follows_user_id_team_id_key" ON "public"."team_follows"("user_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_statistics_date_key" ON "public"."user_statistics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "api_football_leagues_api_id_key" ON "public"."api_football_leagues"("api_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_football_teams_api_id_key" ON "public"."api_football_teams"("api_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_football_players_api_id_key" ON "public"."api_football_players"("api_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_football_coaches_team_id_api_id_key" ON "public"."api_football_coaches"("team_id", "api_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_football_fixtures_api_id_key" ON "public"."api_football_fixtures"("api_id");

-- CreateIndex
CREATE INDEX "api_fixture_highlights_fixture_id_idx" ON "public"."api_fixture_highlights"("fixture_id");

-- CreateIndex
CREATE INDEX "_ApiFootballSeasonToApiFootballTeam_B_index" ON "public"."_ApiFootballSeasonToApiFootballTeam"("B");

-- CreateIndex
CREATE INDEX "_ApiFootballPlayerToApiFootballSeason_B_index" ON "public"."_ApiFootballPlayerToApiFootballSeason"("B");

-- CreateIndex
CREATE INDEX "_ApiFootballPlayerToApiFootballTeam_B_index" ON "public"."_ApiFootballPlayerToApiFootballTeam"("B");

-- AddForeignKey
ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contacts" ADD CONSTRAINT "contacts_handled_by_id_fkey" FOREIGN KEY ("handled_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."team_follows" ADD CONSTRAINT "team_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."api_football_seasons" ADD CONSTRAINT "api_football_seasons_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."api_football_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."api_football_coaches" ADD CONSTRAINT "api_football_coaches_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."api_football_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."api_football_fixtures" ADD CONSTRAINT "api_football_fixtures_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."api_football_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."api_football_fixtures" ADD CONSTRAINT "api_football_fixtures_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "public"."api_football_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."api_football_fixtures" ADD CONSTRAINT "api_football_fixtures_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "public"."api_football_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ApiFootballSeasonToApiFootballTeam" ADD CONSTRAINT "_ApiFootballSeasonToApiFootballTeam_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."api_football_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ApiFootballSeasonToApiFootballTeam" ADD CONSTRAINT "_ApiFootballSeasonToApiFootballTeam_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."api_football_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ApiFootballPlayerToApiFootballSeason" ADD CONSTRAINT "_ApiFootballPlayerToApiFootballSeason_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."api_football_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ApiFootballPlayerToApiFootballSeason" ADD CONSTRAINT "_ApiFootballPlayerToApiFootballSeason_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."api_football_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ApiFootballPlayerToApiFootballTeam" ADD CONSTRAINT "_ApiFootballPlayerToApiFootballTeam_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."api_football_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ApiFootballPlayerToApiFootballTeam" ADD CONSTRAINT "_ApiFootballPlayerToApiFootballTeam_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."api_football_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
