/*
  Warnings:

  - Made the column `total` on table `Election` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Election" ALTER COLUMN "total" SET NOT NULL;
