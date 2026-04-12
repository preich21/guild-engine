import { loadEnvConfig } from "@next/env"
import { sql } from "drizzle-orm"

loadEnvConfig(process.cwd())

async function main() {
  const { db } = await import("../src/lib/db")
  const result = await db.execute(sql`select 1 as ok`)
  console.log("Database check passed:", result.rows[0])
}

main()
  .catch((error) => {
    console.error("Database check failed:", error)
    process.exitCode = 1
  })


