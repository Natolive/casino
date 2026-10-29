-- Fin des joueurs anonymes : leurs portefeuilles (et leurs mises) partent avec eux.
DELETE FROM "players";--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "players" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "username" text NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "password_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "role" text DEFAULT 'player' NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_username_unique" UNIQUE("username");--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "role_known" CHECK ("players"."role" in ('player', 'admin'));