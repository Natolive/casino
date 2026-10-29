CREATE TABLE "roulette_bets" (
	"round_id" integer NOT NULL,
	"player_id" uuid NOT NULL,
	"bets" jsonb NOT NULL,
	"staked" integer NOT NULL,
	"won" integer,
	CONSTRAINT "roulette_bets_round_id_player_id_pk" PRIMARY KEY("round_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "roulette_rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"result" smallint,
	"hash" text NOT NULL,
	"seed" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "roulette_bets" ADD CONSTRAINT "roulette_bets_round_id_roulette_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."roulette_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roulette_bets" ADD CONSTRAINT "roulette_bets_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "roulette_bets_player_id_index" ON "roulette_bets" USING btree ("player_id");