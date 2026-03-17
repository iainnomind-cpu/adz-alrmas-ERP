import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno del .env
dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan credenciales de supabase en el .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testIVA() {
    console.log("Verificando tabla price_list...");
    const { data: cols, error: errCols } = await supabase
        .from('price_list')
        .select('has_tax, tax_rate, price_with_tax_mxn')
        .limit(1);

    if (errCols) {
        console.error("Error al consultar las columnas de IVA:", errCols.message);
        console.log("Asegúrate de ejecutar la migración 20260311_add_tax_to_price_list.sql en tu panel de Supabase.");
    } else {
        console.log("✅ Columnas de IVA encontradas correctamente.");
    }

}

testIVA();
