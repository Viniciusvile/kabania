
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debug() {
  console.log("Checking tables...")
  
  const { data: actData, error: actError } = await supabase.from('activities').select('id, company_id, status').limit(5)
  console.log("Activities Sample:", actData, actError)

  const { data: srData, error: srError } = await supabase.from('service_requests').select('id, company_id, status').limit(5)
  console.log("Service Requests Sample:", srData, srError)

  const { data: shiftsData, error: shiftsError } = await supabase.from('shifts').select('id, service_request_id').limit(5)
  console.log("Shifts Sample:", shiftsData, shiftsError)
}

debug()
