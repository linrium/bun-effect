import { afterAll, beforeAll, mock } from "bun:test"
import { PostgreSqlContainer } from "@testcontainers/postgresql"
import { Wait } from "testcontainers"

const container = await new PostgreSqlContainer("postgres:18")
	.withWaitStrategy(Wait.forHealthCheck())
	.start()

beforeAll(async () => {
	const uri = container.getConnectionUri()
	const port = container.getPort()

	process.env.INIT_DATABASE_URL = uri
	process.env.DATABASE_URL = uri
	process.env.DATABASE_PORT = port.toString()
	process.env.ENV = "test"
})

afterAll(async () => {
	console.log(`tear down container ${container.getId()}`)
	await container.stop()
	mock.clearAllMocks()
})
