# Configuración de Envío de Reportes por Correo

## 📋 Pasos para Configurar Resend en Supabase

### 1. Acceder al Dashboard de Supabase

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. En el menú lateral, ve a **Settings** (Configuración)
4. Selecciona **Edge Functions**

### 2. Agregar Secretos (Secrets)

Necesitas agregar los siguientes secretos:

#### RESEND_API_KEY
```
re_eYcgSMZ8_BqmTirYX656Rkoadv6cDh8y1
```

#### RESEND_FROM_EMAIL (Opcional - usar dominio verificado)
```
reportes@adzalarmas.com
```

**Pasos:**
1. En la sección de Edge Functions, busca "Secrets" o "Environment Variables"
2. Click en "Add new secret"
3. Nombre: `RESEND_API_KEY`
4. Valor: `re_eYcgSMZ8_BqmTirYX656Rkoadv6cDh8y1`
5. Click en "Save"

### 3. Verificar Dominio en Resend

Para usar `reportes@adzalarmas.com`, necesitas verificar el dominio en Resend:

1. Ve a [https://resend.com/domains](https://resend.com/domains)
2. Click en "Add Domain"
3. Ingresa: `adzalarmas.com`
4. Resend te dará registros DNS para agregar:
   - **SPF Record** (TXT)
   - **DKIM Record** (TXT)
   - **DMARC Record** (TXT)

5. Agrega estos registros en tu proveedor de DNS (GoDaddy, Cloudflare, etc.)
6. Espera 24-48 horas para verificación

**Alternativa para Pruebas:**
Si quieres probar inmediatamente sin verificar el dominio, usa:
```typescript
from: 'onboarding@resend.dev'
```
Esto solo enviará correos a tu email verificado en Resend.

### 4. Desplegar la Edge Function

#### Opción A: Desde el Dashboard de Supabase (Recomendado)

1. Ve a **Edge Functions** en el dashboard
2. Click en "Deploy new function"
3. Selecciona los archivos:
   - `supabase/functions/send-service-report/index.ts`
   - `supabase/functions/send-service-report/deno.json`
4. Click en "Deploy"

#### Opción B: Usando Supabase CLI (Avanzado)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link al proyecto
supabase link --project-ref [tu-project-ref]

# Desplegar función
supabase functions deploy send-service-report
```

### 5. Probar la Función

1. Ve a tu aplicación
2. Abre un reporte de servicio
3. Click en "Enviar por Email"
4. Verifica que el correo llegue

### 6. Verificar Logs

Para ver si hay errores:

1. En el Dashboard de Supabase, ve a **Edge Functions**
2. Selecciona `send-service-report`
3. Ve a la pestaña **Logs**
4. Revisa los mensajes de consola

## 🔍 Troubleshooting

### Error: "Missing Supabase environment variables"
- Verifica que los secretos estén configurados correctamente
- Redespliega la función después de agregar secretos

### Error: "Error sending email"
- Verifica que la API Key de Resend sea correcta
- Verifica que el dominio esté verificado (o usa `onboarding@resend.dev` para pruebas)

### El correo no llega
- Revisa la carpeta de spam
- Verifica los logs de Resend: [https://resend.com/emails](https://resend.com/emails)
- Verifica que el email del cliente esté correcto

### Error: "Function not found"
- Asegúrate de que la función esté desplegada
- Verifica el nombre de la función en el código

## 📧 Formato del Email

El email incluye:
- ✅ Logo y branding de Alarmas ADZ
- ✅ Información del cliente
- ✅ Detalles del servicio
- ✅ Tabla de materiales utilizados
- ✅ Resumen de costos con IVA
- ✅ Diseño responsive para móviles
- ✅ Colores corporativos (rojo #DC2626)

## 🎯 Próximos Pasos

Una vez configurado el envío de reportes de servicio, podemos implementar:

1. **Envío de Tarjetas Digitales** - Enviar tarjetas de cliente por correo
2. **Envío de Notificaciones** - Recordatorios, cumpleaños, etc.
3. **Envío de Reportes de Dashboard** - Aging Report, Inventory Report, etc.

## 📞 Soporte

Si tienes problemas, revisa:
- Documentación de Resend: [https://resend.com/docs](https://resend.com/docs)
- Documentación de Supabase Edge Functions: [https://supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)
