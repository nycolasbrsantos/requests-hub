import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as dotenv from 'dotenv'

dotenv.config({
  path: '.env.local',
})

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in .env.local')
}

// Cliente de conexão do Postgres
const client = postgres(process.env.DATABASE_URL)

// Instância do Drizzle que usaremos em toda a aplicação
export const db = drizzle(client)
