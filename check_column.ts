
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumn() {
    const { data, error } = await supabase
        .from('billing_documents')
        .select('cancelled_at')
        .limit(1);

    if (error) {
        console.error('Error selecting cancelled_at:', error.message);
    } else {
        console.log('Column cancelled_at exists!');
    }
}

checkColumn();
