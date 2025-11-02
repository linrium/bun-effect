import { randomUUIDv7 } from "bun"
import { Effect, Layer, Logger } from "effect"
import { MigratorLive } from "./migrator"
import { PgLive, PgSetupLive } from "./pg"
import { describe, test } from "./testing/test"

const testLayer = Layer.unwrapEffect(
	Effect.gen(function* () {
		const migrator = yield* MigratorLive

		yield* migrator.up()

		return Layer.mergeAll(PgLive.Default, MigratorLive.Default)
	}),
).pipe(Layer.provide(MigratorLive.Default), Layer.provide(PgSetupLive.Default))

describe("2 + 2", () => {
	test("1", () => {
		const run = Effect.gen(function* () {
			const pg = yield* PgLive

			yield* pg.sql`INSERT INTO users (id, email) VALUES (${randomUUIDv7()}, ${"linh@gmail.com"})`

			const users = yield* pg.sql`SELECT * FROM users`
			console.log("users", users)
		}).pipe(Effect.provide(testLayer), Effect.provide(Logger.pretty))

		return run
	})

	test("2", () => {
		const run = Effect.gen(function* () {
			const pg = yield* PgLive

			yield* pg.sql`INSERT INTO users (id, email) VALUES (${randomUUIDv7()}, ${"linh@gmail.com"})`

			const users = yield* pg.sql`SELECT * FROM users`
			console.log("users", users)
		}).pipe(Effect.provide(testLayer), Effect.provide(Logger.pretty))

		return run
	})
})
