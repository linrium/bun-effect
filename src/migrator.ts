import fs from "node:fs"
import path from "node:path"
import { SQL } from "bun"
import { Effect, Redacted } from "effect"
import { Umzug } from "umzug"
import { PgSetupLive } from "./pg"

export class MigratorLive extends Effect.Service<MigratorLive>()(
	"MigratorLive",
	{
		effect: Effect.gen(function* () {
			const setup = yield* PgSetupLive
			const sql = new SQL(Redacted.value(setup.uri))

			const migrator = new Umzug({
				migrations: {
					glob: ["migrations/*.sql", { cwd: "." }],
					resolve(params) {
						const migrationPath = params.path
						if (!migrationPath) {
							throw new Error("Migration path is undefined")
						}

						const downPath = path.join(
							path.dirname(migrationPath),
							"down",
							path.basename(migrationPath),
						)

						const query = (path: string) => async () =>
							params.context.query(fs.readFileSync(path).toString())

						return {
							name: params.name,
							path: migrationPath,
							up: query(migrationPath),
							down: query(downPath),
						}
					},
				},
				context: () => ({
					query: sql.unsafe,
				}),
				storage: {
					async executed({ context: client }) {
						await client.query(
							`create table if not exists my_migrations_table(name text)`,
						)
						const results: { name: string }[] = await client.query(
							`select name from my_migrations_table`,
						)

						return results.map((x) => x.name)
					},
					async logMigration({ name, context: client }) {
						await client.query(
							`insert into my_migrations_table(name) values ($1)`,
							[name],
						)
					},
					async unlogMigration({ name, context: client }) {
						await client.query(
							`delete from my_migrations_table where name = $1`,
							[name],
						)
					},
				},
				logger: {
					debug: console.debug,
					info: () => {},
					warn: console.warn,
					error: console.error,
				},
				create: {
					folder: "migrations",
				},
			})

			const up = () =>
				Effect.promise(() => migrator.up()).pipe(
					Effect.tap(() => Effect.logInfo("Migrated successfully")),
				)

			const executed = () => Effect.promise(() => migrator.executed())
			const pending = () => Effect.promise(() => migrator.pending())

			return {
				up,
				executed,
				pending,
			} as const
		}),
	},
) {}
