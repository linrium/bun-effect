import {
	describe as bunDescribe,
	expect as bunExpect,
	test as bunTest,
} from "bun:test"
import { Effect } from "effect"

export const test = (
	label: string,
	// biome-ignore lint/suspicious/noExplicitAny: no
	cb: () => Effect.Effect<any, any, never>,
) =>
	bunTest(label, () =>
		Effect.runPromiseExit(
			Effect.scoped(cb()).pipe(Effect.catchAll((e) => Effect.logError(e))),
		),
	)

export const describe = (label: string, cb: () => void) =>
	bunDescribe(label, cb)

export const expect = bunExpect
