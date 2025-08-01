-- CreateEnum
CREATE TYPE "Category" AS ENUM ('MOTOGP', 'MOTO2', 'MOTO3');

-- CreateEnum
CREATE TYPE "LeagueRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "RaceStatus" AS ENUM ('FINISHED', 'DNF', 'DNS', 'DSQ');

-- CreateEnum
CREATE TYPE "SyncType" AS ENUM ('RIDERS', 'CALENDAR', 'RACE_RESULTS');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('RACE_REMINDER', 'LEAGUE_INVITE', 'TRADE_OFFER', 'RACE_RESULTS', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 1000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "team" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "nationality" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "photoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "apiLegacyId" INTEGER,
    "apiRiderId" TEXT,

    CONSTRAINT "Rider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamRider" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "purchasePrice" INTEGER NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamRider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueRider" (
    "leagueId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,

    CONSTRAINT "LeagueRider_pkey" PRIMARY KEY ("leagueId","riderId")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "maxTeams" INTEGER NOT NULL DEFAULT 10,
    "budget" INTEGER NOT NULL DEFAULT 1000,
    "scoringRules" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "role" "LeagueRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Race" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "circuit" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sprintDate" TIMESTAMP(3),
    "round" INTEGER NOT NULL,
    "season" INTEGER NOT NULL,
    "apiEventId" TEXT,
    "apiBroadcastId" TEXT,
    "apiSessionIds" JSONB,

    CONSTRAINT "Race_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceLineup" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaceLineup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineupRider" (
    "id" TEXT NOT NULL,
    "lineupId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "predictedPosition" INTEGER NOT NULL,

    CONSTRAINT "LineupRider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceResult" (
    "id" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "position" INTEGER,
    "points" INTEGER NOT NULL DEFAULT 0,
    "fastestLap" BOOLEAN NOT NULL DEFAULT false,
    "polePosition" BOOLEAN NOT NULL DEFAULT false,
    "dnf" BOOLEAN NOT NULL DEFAULT false,
    "fantasyPoints" INTEGER NOT NULL DEFAULT 0,
    "status" "RaceStatus" NOT NULL DEFAULT 'FINISHED',

    CONSTRAINT "RaceResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamScore" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiderStats" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "races" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "podiums" INTEGER NOT NULL DEFAULT 0,
    "poles" INTEGER NOT NULL DEFAULT 0,
    "fastestLaps" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "avgPosition" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "RiderStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "type" "SyncType" NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "message" TEXT,
    "details" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_LeagueToRace" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Rider_number_key" ON "Rider"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Rider_apiLegacyId_key" ON "Rider"("apiLegacyId");

-- CreateIndex
CREATE UNIQUE INDEX "Rider_apiRiderId_key" ON "Rider"("apiRiderId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_userId_leagueId_key" ON "Team"("userId", "leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamRider_teamId_riderId_key" ON "TeamRider"("teamId", "riderId");

-- CreateIndex
CREATE UNIQUE INDEX "League_code_key" ON "League"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMember_userId_leagueId_key" ON "LeagueMember"("userId", "leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "Race_apiEventId_key" ON "Race"("apiEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Race_apiBroadcastId_key" ON "Race"("apiBroadcastId");

-- CreateIndex
CREATE UNIQUE INDEX "RaceLineup_teamId_raceId_key" ON "RaceLineup"("teamId", "raceId");

-- CreateIndex
CREATE UNIQUE INDEX "LineupRider_lineupId_riderId_key" ON "LineupRider"("lineupId", "riderId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamScore_teamId_raceId_key" ON "TeamScore"("teamId", "raceId");

-- CreateIndex
CREATE UNIQUE INDEX "RiderStats_riderId_season_key" ON "RiderStats"("riderId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "_LeagueToRace_AB_unique" ON "_LeagueToRace"("A", "B");

-- CreateIndex
CREATE INDEX "_LeagueToRace_B_index" ON "_LeagueToRace"("B");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRider" ADD CONSTRAINT "TeamRider_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRider" ADD CONSTRAINT "TeamRider_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueRider" ADD CONSTRAINT "LeagueRider_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueRider" ADD CONSTRAINT "LeagueRider_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceLineup" ADD CONSTRAINT "RaceLineup_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceLineup" ADD CONSTRAINT "RaceLineup_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineupRider" ADD CONSTRAINT "LineupRider_lineupId_fkey" FOREIGN KEY ("lineupId") REFERENCES "RaceLineup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineupRider" ADD CONSTRAINT "LineupRider_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamScore" ADD CONSTRAINT "TeamScore_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamScore" ADD CONSTRAINT "TeamScore_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderStats" ADD CONSTRAINT "RiderStats_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LeagueToRace" ADD CONSTRAINT "_LeagueToRace_A_fkey" FOREIGN KEY ("A") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LeagueToRace" ADD CONSTRAINT "_LeagueToRace_B_fkey" FOREIGN KEY ("B") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;
