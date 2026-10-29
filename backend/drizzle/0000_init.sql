CREATE TABLE "players" (
	"id" uuid PRIMARY KEY NOT NULL,
	"balance" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "balance_not_negative" CHECK ("players"."balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "roulette_spins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"result" smallint NOT NULL,
	"staked" integer NOT NULL,
	"won" integer NOT NULL,
	"bets" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "roulette_spins" ADD CONSTRAINT "roulette_spins_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "roulette_spins_player_id_created_at_index" ON "roulette_spins" USING btree ("player_id","created_at" DESC NULLS LAST);