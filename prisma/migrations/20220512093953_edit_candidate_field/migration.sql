/*
  Warnings:

  - Added the required column `profile` to the `Candidate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `promise` to the `Candidate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "profile" TEXT NOT NULL,
ADD COLUMN     "promise" TEXT NOT NULL;
