import { Effect, Logger, Option } from "effect"
import { SimpleData } from "./domains/Hello"
import { MigratorLive } from "./migrator"
import { PgLive, PgSetupLive } from "./pg"

const program = Effect.gen(function* () {
	const migrator = yield* MigratorLive
	const pg = yield* PgLive

	yield* migrator.up()

	const row = yield* pg.sql`SELECT 1 as num`.one(SimpleData)
	console.log(row)

	const result = yield* pg.begin((sql) =>
		Effect.gen(function* () {
			const value = yield* sql`SELECT 1 as num`.one(SimpleData)

			if (Option.isNone(value)) {
				return null
			}

			return value.value.num
		}),
	)

	console.log("result", result)
}).pipe(
	Effect.provide(PgLive.Default),
	Effect.provide(MigratorLive.Default),
	Effect.provide(PgSetupLive.Default),
	Effect.provide(Logger.pretty),
)

Effect.runPromise(program)
