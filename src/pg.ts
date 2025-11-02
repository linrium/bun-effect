import { SqlError } from "@effect/sql"
import { SQL, sql } from "bun"
import { Config, Effect, Option, Random, Redacted, Schema } from "effect"
import type { ParseError } from "effect/ParseResult"

export class PgSetupLive extends Effect.Service<PgSetupLive>()("PgSetupLive", {
  effect: Effect.gen(function* () {
    const initUri = yield* Config.redacted("DATABASE_URL")
    const env = yield* Config.string("ENV")

    if (env === "test") {
      const port = yield* Config.number("DATABASE_PORT")
      const sql = new SQL(Redacted.value(initUri))
      const seed = yield* Random.nextInt

      const dbname = `test_${seed}`
      const uri = Redacted.make(
        `postgresql://test:test@localhost:${port}/${dbname}`,
      )

      yield* Effect.promise(() => sql`create database ${sql(dbname)}`)

      return {
        uri,
      } as const
    }

    return {
      uri: initUri,
    } as const
  }),
}) {}

export class PgLive extends Effect.Service<PgLive>()("PgLive", {
  scoped: Effect.acquireRelease(
    Effect.gen(function* () {
      const setup = yield* PgSetupLive
      const pg = new SQL(Redacted.value(setup.uri))

      type SQLResult<T> = [T] & {
        count: number
        command: string
        lastInsertRowid: string | null
        affectedRows: number | null
      }

      type EffectSQL = <T = unknown>(
        strings: TemplateStringsArray,
        // biome-ignore lint/suspicious/noExplicitAny: no
        ...values: any[]
      ) => Effect.Effect<SQLResult<T>, SqlError.SqlError, never> & {
        map: <A, I>(
          schema: Schema.Schema<A, I, never>,
        ) => Effect.Effect<A, SqlError.SqlError | ParseError, never>
        many: <A, I>(
          schema: Schema.Schema<A, I, never>,
        ) => Effect.Effect<readonly A[], SqlError.SqlError | ParseError, never>
        one: <A, I>(
          schema: Schema.Schema<A, I, never>,
        ) => Effect.Effect<
          Option.None<NonNullable<A>> | Option.Some<NonNullable<A>>,
          SqlError.SqlError | ParseError,
          never
        >
      }

      const handleSQLError = (error: unknown) => {
        if (error instanceof SQL.PostgresError) {
          return new SqlError.SqlError({
            cause: error.cause,
            message: error.message,
          })
        }

        return new SqlError.SqlError({
          cause: error,
          message: "Failed to execute SQL query",
        })
      }

      const makeExecute =
        (pg: SQL): EffectSQL =>
        // biome-ignore lint/suspicious/noExplicitAny: no
        <T>(strings: TemplateStringsArray, ...values: any[]) => {
          const run = Effect.gen(function* () {
            const result = yield* Effect.tryPromise({
              try: () =>
                pg<
                  [T] & {
                    count: number
                    command: string
                    lastInsertRowid: string | null
                    affectedRows: number | null
                  }
                >(strings, ...values),
              catch: handleSQLError,
            })

            return result
          })

          const map = <A, I>(schema: Schema.Schema<A, I, never>) =>
            Effect.gen(function* () {
              const result = yield* run

              return yield* Schema.decodeUnknownEither(schema)(result)
            })

          const many = <A, I>(schema: Schema.Schema<A, I, never>) =>
            map(Schema.Array(schema))

          return Object.assign(run, {
            map,
            many,
            one: <A, I>(schema: Schema.Schema<A, I, never>) =>
              many(schema).pipe(
                Effect.map((xs) => xs[0]),
                Effect.map((xs) => (xs ? Option.some(xs) : Option.none())),
              ),
          })
        }

      const begin = <T>(
        cb: (
          tx: EffectSQL,
        ) => Effect.Effect<T, SqlError.SqlError | ParseError, never>,
      ) => {
        const run = Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () => {
              return sql.begin((bunTx) => {
                return Effect.runPromise(cb(makeExecute(bunTx)))
              })
            },
            catch: handleSQLError,
          })

          return result
        })

        return run
      }

      const close = () => Effect.promise(() => pg.close())

      return {
        sql: makeExecute(pg),
        begin,
        close,
      } as const
    }),
    (pg) => pg.close(),
  ),
}) {}
