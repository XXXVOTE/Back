/*
  Warnings:

  - Made the column `info` on table `Election` required. This step will fail if there are existing NULL values in that column.
  - Made the column `quorum` on table `Election` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Election" ALTER COLUMN "info" SET NOT NULL,
ALTER COLUMN "quorum" SET NOT NULL;
