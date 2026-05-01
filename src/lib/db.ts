import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

const createDb = () => {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error("Missing DATABASE_URL in environment")
  }

  const pool = new Pool({ connectionString })

  return drizzle({ client: pool })
}

type Db = ReturnType<typeof createDb>

let dbInstance: Db | undefined

const getDb = () => {
  dbInstance ??= createDb()

  return dbInstance
}

export const db = new Proxy({} as Db, {
  get(_target, property) {
    const value = Reflect.get(getDb(), property)

    return typeof value === "function" ? value.bind(getDb()) : value
  },
})
