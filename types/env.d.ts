declare namespace NodeJS {
	interface ProcessEnv {
		NODE_ENV: "development" | "production" | "test"
		INIT_DATABASE_URL: string
		DATABASE_URL: string
		DATABASE_PORT: string
		ENV: string
		PORT?: string
	}
}
