-- Comptes à pseudo, sans email : supprimés (il faut se réinscrire).
DELETE FROM "players";--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "first_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "last_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_email_unique" UNIQUE("email");