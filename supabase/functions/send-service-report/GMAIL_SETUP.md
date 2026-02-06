# Configuración de Gmail SMTP para Envío de Reportes

## 📋 Pasos para Configurar Gmail

### Paso 1: Crear Contraseña de Aplicación en Google

1. **Ir a tu cuenta de Google**
   - Ve a: https://myaccount.google.com/
   - Inicia sesión con tu Gmail

2. **Activar Verificación en 2 Pasos** (si no la tienes)
   - Ve a: https://myaccount.google.com/security
   - Busca "Verificación en 2 pasos"
   - Click en "Comenzar" y sigue las instrucciones
   - Configura tu teléfono para recibir códigos

3. **Crear Contraseña de Aplicación**
   - Ve a: https://myaccount.google.com/apppasswords
   - Selecciona "Correo" como aplicación
   - Selecciona "Otro" como dispositivo
   - Escribe: "Alarmas ADZ Reportes"
   - Click en "Generar"
   - **COPIA LA CONTRASEÑA** (16 caracteres, sin espacios)
   - Ejemplo: `abcd efgh ijkl mnop` → Copiar como `abcdefghijklmnop`

### Paso 2: Configurar Secretos en Supabase

1. **Ir al Dashboard de Supabase**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto
   - Ve a **Edge Functions** → **Settings** → **Secrets**

2. **Agregar GMAIL_USER**
   - Click en "Add new secret"
   - Name: `GMAIL_USER`
   - Value: `tu-correo@gmail.com` (el que me proporciones)
   - Click en "Save"

3. **Agregar GMAIL_APP_PASSWORD**
   - Click en "Add new secret"
   - Name: `GMAIL_APP_PASSWORD`
   - Value: La contraseña de 16 caracteres que copiaste
   - Click en "Save"

### Paso 3: Desplegar Edge Function Actualizada

Una vez actualizado el código con Nodemailer:

1. Ve a **Edge Functions** en Supabase
2. Selecciona `send-service-report`
3. Click en **Deploy** o **Redeploy**
4. Copia y pega el código actualizado

### Paso 4: Probar el Envío

1. Abre tu aplicación en Vercel
2. Ve a una orden de servicio completada
3. Click en "Ver Reporte de Servicio"
4. Click en "Enviar por Email"
5. Verifica que llegue el correo

## ⚠️ Limitaciones de Gmail

- **Límite diario**: 500 correos por día
- **Límite por hora**: ~100 correos por hora
- **Riesgo**: Si envías muchos correos, Google puede bloquear temporalmente tu cuenta

## 🔍 Troubleshooting

### Error: "Invalid login"
- Verifica que la contraseña de aplicación esté correcta
- Asegúrate de copiarla sin espacios

### Error: "Less secure app access"
- Usa contraseña de aplicación, NO tu contraseña normal

### El correo no llega
- Revisa spam del destinatario
- Verifica que el email del cliente sea correcto
- Revisa los logs en Supabase

## 📧 Formato del Email

Los correos se enviarán:
- **De**: Tu Gmail configurado
- **Para**: Email del cliente
- **Asunto**: Reporte de Servicio - #[número]
- **Contenido**: HTML profesional con branding de Alarmas ADZ
