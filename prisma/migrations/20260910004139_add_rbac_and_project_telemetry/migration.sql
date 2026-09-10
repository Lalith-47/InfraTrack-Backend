-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPERVISOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "InputChannel" AS ENUM ('EXCEL', 'TEXT', 'VOICE');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'SUPERVISOR';

-- CreateTable
CREATE TABLE "activity_update" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "channel" "InputChannel" NOT NULL,
    "notes" TEXT NOT NULL,
    "progressDelta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_update_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_point" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "plannedProgress" DOUBLE PRECISION NOT NULL,
    "actualProgress" DOUBLE PRECISION NOT NULL,
    "milestone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_point_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_update_projectId_idx" ON "activity_update"("projectId");

-- CreateIndex
CREATE INDEX "timeline_point_projectId_idx" ON "timeline_point"("projectId");

-- AddForeignKey
ALTER TABLE "activity_update" ADD CONSTRAINT "activity_update_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_point" ADD CONSTRAINT "timeline_point_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
