# Aplicación de SMS y WhatsApp

Aplicación en Express para cargar destinatarios desde Excel y enviar SMS o
notificaciones de plantilla de WhatsApp mediante Infobip. El backend también
sirve el frontend, por lo que no es necesario levantar dos procesos.

## Requisitos

- Node.js 18 o superior
- Una cuenta de Infobip con una API key que tenga los permisos
  `sms:message:send` y `whatsapp:message:send`
- El Base URL asignado por Infobip (por ejemplo,
  `https://xxxxx.api.infobip.com`)

## Instalación y configuración

```bash
npm install
cp .env.example .env
```

Edita `.env` con tus datos:

```dotenv
PORT=3000
HOST=127.0.0.1
INTERNAL_API_KEY=UN_SECRETO_LARGO_PARA_TUS_ENDPOINTS
INFOBIP_BASE_URL=https://TU_SUBDOMINIO.api.infobip.com
INFOBIP_SMS_API_KEY=API_KEY_CON_PERMISO_SMS
INFOBIP_SENDER=ServiceSMS
INFOBIP_WHATSAPP_API_KEY=API_KEY_CON_PERMISO_WHATSAPP
INFOBIP_WHATSAPP_SENDER=12079526362
INFOBIP_WHATSAPP_TEMPLATE_NAME=mp_mujer
INFOBIP_WHATSAPP_TEMPLATE_LANGUAGE=es
INFOBIP_WHATSAPP_TEMPLATE_ID=1164159739637488
DEFAULT_NOTIFICATION_MESSAGE=Bienvenida a Mujer MP. Tu espacio para cuidarte y encontrar apoyo. Descarga la app en tu celular: https://mpvirtual.mp.gob.gt/backend/mobile/store-mujer
```

Las API keys nunca deben enviarse desde Postman ni incluirse en el código. La
clave de SMS necesita `sms:message:send` y la de WhatsApp necesita
`whatsapp:message:send`. El archivo `.env` está ignorado por Git.

Cuando `INTERNAL_API_KEY` tenga un valor, las solicitudes a `/api/sms` y
`/api/whatsapp` deben incluir este encabezado en Postman:

```text
x-api-key: EL_MISMO_VALOR_DE_INTERNAL_API_KEY
```

Configura esta clave antes de publicar el servidor para evitar que terceros
generen mensajes y cargos. El endpoint `/health` no utiliza esta clave.

## Levantar frontend y backend

Frontend y backend se ejecutan juntos desde Express. En desarrollo usa:

```bash
npm run dev
```

Este comando reinicia automáticamente el servidor cuando modificas archivos
del backend. Para ejecutar la aplicación sin modo de observación usa:

```bash
npm start
```

Después abre estas direcciones:

- Frontend: `http://127.0.0.1:3000`
- Estado del backend: `http://127.0.0.1:3000/health`
- API de SMS: `POST http://127.0.0.1:3000/api/sms`
- API de WhatsApp: `POST http://127.0.0.1:3000/api/whatsapp`

Si cambias `HOST` o `PORT` en `.env`, utiliza esos valores en las direcciones.
Para detener la aplicación presiona `Ctrl+C` en la terminal.

## Frontend para cargas de Excel

La pantalla permite descargar `plantilla_numeros.xlsx`, cargarla y elegir entre
**Enviar por WhatsApp** o **Enviar por SMS**. Si configuraste
`INTERNAL_API_KEY`, escribe ese mismo valor en el campo **Clave interna de la
API**; la interfaz lo usa únicamente durante la sesión y no lo guarda.

La plantilla contiene una hoja llamada `Numeros`. Escribe un destinatario por
fila en la columna `telefono`, usando únicamente los 8 dígitos de Guatemala:

| telefono |
|----------|
| 50414742 |
| 55555555 |

No agregues `+502`, espacios ni guiones. Al cargar el archivo, el backend añade
`+502`, elimina duplicados y señala las filas inválidas. Se admiten archivos
`.xlsx` de hasta 2 MB y un máximo de 2,000 números; la pantalla procesa los
envíos de forma secuencial en grupos de 100.

WhatsApp usa la plantilla configurada en
`INFOBIP_WHATSAPP_TEMPLATE_NAME` (actualmente `mp_mujer`) y solo funcionará
cuando Infobip/Meta la marque como aprobada. En SMS puedes editar el texto antes
de confirmar el envío.

Antes de enviar por WhatsApp, el backend consulta
`INFOBIP_WHATSAPP_TEMPLATE_ID` en Infobip y bloquea la solicitud si la plantilla
no existe, no coincide en nombre o idioma, o su estado no es `APPROVED`. Una
respuesta inicial de envío únicamente confirma recepción por Infobip; la
entrega final debe comprobarse mediante reportes de entrega o webhooks.

La plantilla de WhatsApp esperada es:

- Nombre: `mp_mujer`
- Idioma: español (`es`)
- Categoría: marketing
- Cuerpo: `Bienvenida a Mujer MP. Tu espacio para cuidarte y encontrar apoyo. Descarga la app en tu celular: https://mpvirtual.mp.gob.gt/backend/mobile/store-mujer`
- Variables: ninguna

El ID `1164159739637488` queda como referencia administrativa; Infobip envía
usando el nombre y el idioma de la plantilla.

## Probar con Postman

Crea una solicitud `POST` a:

```text
http://127.0.0.1:3000/api/sms
```

Selecciona **Body > raw > JSON** y envía:

```json
{
  "to": ["+50250414742", "+50255555555"],
  "message": "Hola desde mi API de Express"
}
```

También puedes enviar un solo número:

```json
{
  "to": "+50250414742",
  "message": "Hola desde mi API de Express"
}
```

Los números deben estar en formato E.164: signo `+`, código de país y número,
sin espacios ni guiones.

Para comprobar que el servidor está activo, usa `GET /health`.

## WhatsApp mediante Infobip

Las notificaciones iniciadas por la empresa deben utilizar una plantilla creada
y aprobada en Infobip/Meta. `INFOBIP_WHATSAPP_SENDER` debe ser el número de
WhatsApp registrado en Infobip, en formato internacional y sin espacios.

Para enviar una plantilla con una URL en la variable `{{1}}` de su cuerpo, usa:

```text
POST http://127.0.0.1:3000/api/whatsapp
```

```json
{
  "to": ["+50250414742"],
  "templateName": "notificacion_url",
  "languageCode": "es",
  "placeholders": ["https://sms.midominio.com/a/8F3kP"]
}
```

Si `INFOBIP_WHATSAPP_TEMPLATE_NAME` e
`INFOBIP_WHATSAPP_TEMPLATE_LANGUAGE` están configuradas, puedes omitir esos dos
campos y enviar únicamente:

```json
{
  "to": "+50250414742"
}
```

`INFOBIP_WHATSAPP_TEMPLATE_ID` se conserva como referencia administrativa. El
endpoint `/whatsapp/1/message/template` identifica la plantilla mediante su
nombre.

Los valores de `placeholders` sustituyen `{{1}}`, `{{2}}`, etc., en el mismo
orden en que aparecen en la plantilla aprobada.

Para una plantilla con botón de URL dinámico, envía únicamente la parte
variable del enlace:

```json
{
  "to": "+50250414742",
  "templateName": "notificacion_con_boton",
  "languageCode": "es",
  "placeholders": [],
  "buttons": [
    {
      "type": "URL",
      "parameter": "a/8F3kP"
    }
  ]
}
```

La URL base del botón se define al registrar la plantilla en Infobip. El
nombre y el idioma enviados deben coincidir exactamente con esa plantilla.

## Notas de Infobip

- En una cuenta de prueba, normalmente debes usar `InfoSMS` como remitente y
  enviar únicamente a destinatarios verificados.
- En producción, el remitente puede necesitar registro o aprobación según el
  país y el operador.
- El remitente de WhatsApp debe estar registrado en Infobip y las plantillas
  deben estar aprobadas antes de enviar notificaciones iniciadas por la empresa.
- Que Infobip devuelva un `messageId` significa que aceptó el envío para
  procesamiento; no confirma todavía la entrega al teléfono.
