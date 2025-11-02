import { Schema } from "effect"

export const SimpleData = Schema.Struct({
	num: Schema.Number,
})

export const ComplexData = Schema.Struct({
	value: Schema.Struct({
		num: Schema.Number,
	}),
})

export const ComplexDataFromSimpleData = Schema.transform(
	SimpleData,
	ComplexData,
	{
		strict: true,
		decode: (fromA) => ({
			value: fromA,
		}),
		encode: (fromB) => fromB.value,
	},
)

export const UserEntity = Schema.Struct({
	id: Schema.UUID,
	email: Schema.String,
})
