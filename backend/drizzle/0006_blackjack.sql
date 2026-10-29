CREATE TABLE "blackjack_bets" (
	"round_id" integer NOT NULL,
	"player_id" uuid NOT NULL,
	"seat" smallint NOT NULL,
	"staked" integer NOT NULL,
	"hands" jsonb,
	"won" integer,
	CONSTRAINT "blackjack_bets_round_id_player_id_pk" PRIMARY KEY("round_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "blackjack_rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"hash" text NOT NULL,
	"seed" text,
	"dealt" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blackjack_bets" ADD CONSTRAINT "blackjack_bets_round_id_blackjack_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."blackjack_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blackjack_bets" ADD CONSTRAINT "blackjack_bets_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blackjack_bets_player_id_index" ON "blackjack_bets" USING btree ("player_id");