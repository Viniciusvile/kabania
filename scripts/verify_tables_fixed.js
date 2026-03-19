import { supabase } from '../src/lib/supabase.js';

async function verifyDetailed() {
    console.log("🛠️ Inspecionando tabelas críticas...");
    
    // Use raw select with 1 record limit to minimize I/O
    const check = async (table) => {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.log(`❌ ${table}: ${error.message}`);
                return false;
            }
            console.log(`✅ ${table}: OK (${data.length} records)`);
            return true;
        } catch (e) {
            console.log(`❌ ${table}: Exception!`);
            return false;
        }
    };

    await check('work_environments');
    await check('work_activities');
    await check('shifts');
    await check('shift_assignments');
    await check('employee_profiles');
    await check('shift_prizes');
    await check('shift_calls');
}

verifyDetailed();
