# Torneo de Truco

Página para organizar torneos de truco **2v2** y **3v3** sin lápiz ni papel.

El organizador arma el cuadro, hace el sorteo y muestra un QR para cada mesa. Cada mesa anota sus propios puntos desde el celular y el cuadro general se actualiza solo, en tiempo real.

Disponible en https://torneotruco.com.ar

## Roles

* **Admin** — aprueba organizadores nuevos, puede ver y gestionar cualquier torneo, y fusiona jugadores duplicados desde su panel.
* **Organizador** — un bar, un club o cualquier persona que organice un torneo. Se registra con su email, pide un link de acceso (sin contraseña) y, una vez aprobado, puede crear y administrar sus propios torneos: carga equipos, realiza el sorteo y reparte los QR de cada mesa. Puede ver en vivo los torneos de otros organizadores, pero no modificarlos.
* **Competidor** — no necesita cuenta. Entra escaneando el QR de su mesa, anota los puntos del partido y desde ahí también puede ver el cuadro completo del torneo.

Nadie necesita recibir un link privado para usar la aplicación. Todo funciona con acceso público o mediante login, salvo el anotador de cada mesa, que vive detrás de su propio QR.

## Qué incluye

* Sorteo automático (nunca empareja dos "libres" entre sí).
* Cuadro en vivo, con una vista rápida de **Mesas pendientes** para no tener que recorrer todo el fixture buscando un QR.
* Repechaje opcional.
* Historial de campeones.
* Modo claro/oscuro y cuatro estilos de tanteador (palitos o fósforos, apilados o lado a lado). Cada dispositivo puede elegir el que prefiera.
* Corrección manual de resultados por parte del organizador, además del anotador normal por QR.

## Antes de arrancar

Corre sobre **Next.js** con **Supabase** como base de datos.

### 1. Base en Supabase

Ejecutar, en este orden, desde el **SQL Editor** de Supabase:

1. `supabase-schema.sql` — crea las tablas base (`tournaments`, `teams`, `matches`).
2. `supabase-schema-v2-roles.sql` — agrega el sistema de cuentas (perfiles, roles y funciones seguras para el anotador sin login).
3. *(Opcional, todavía no integrado a la interfaz)* `supabase-schema-v3-jugadores.sql` — ubicación estructurada y jugadores individuales.

Después:

* **Authentication → Providers**: confirmar que **Email** esté activo.
* **Authentication → URL Configuration**:

  * **Site URL** = tu dominio (`https://torneotruco.com.ar`).
  * Agregar `https://tudominio/organizador/panel` en **Redirect URLs**.
* **Project Settings → API**: copiar el **Project URL** y la **anon/publishable key**.

### 2. Mails que no caigan en spam (recomendado)

Por defecto, Supabase envía pocos correos por hora usando su servidor compartido. Sirve para hacer pruebas, pero no para producción.

Lo recomendable es conectar un SMTP propio:

1. Crear una cuenta gratuita en **Resend** y generar una API Key.
2. Verificar el dominio (Resend indica los registros DNS que hay que agregar).
3. En **Supabase → Project Settings → Auth → SMTP Settings**, activar el SMTP personalizado con:

   * Host: `smtp.resend.com`
   * Puerto: `587`
   * Usuario: `resend`
   * Contraseña: la API Key
   * Remitente: una dirección de tu dominio ya verificado.

### 3. Volverte Admin (una sola vez)

Nadie puede aprobar al primer administrador, así que ese paso se hace manualmente.

1. Registrate desde `/organizador/acceso` con tu email.
2. En **Supabase → Table Editor → profiles**, buscá tu fila y cambiá:

   * `role = admin`
   * `status = aprobado`
3. A partir de ahí, el resto de los organizadores puede aprobarse desde la propia aplicación.

### 4. Correrlo localmente

Crear un `.env.local` (tomando como referencia `.env.example`) con las dos claves de Supabase y ejecutar:

```bash
npm install
npm run dev
```

### 5. Desplegar

Importar el repositorio en Vercel, configurar las variables de entorno:

* `NEXT_PUBLIC_SUPABASE_URL`
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`

y hacer el deploy.

Si usás un dominio propio, agregarlo desde **Settings → Domains** y apuntar los nameservers a `ns1.vercel-dns.com` y `ns2.vercel-dns.com` desde el proveedor donde registraste el dominio.

## Uso el día del torneo

1. El organizador entra a su panel y crea el torneo (nombre, lugar, fecha y categoría).
2. Carga los equipos y realiza el sorteo.
3. Desde la pestaña **Mesas**, muestra el QR correspondiente a cada partido.
4. Cada mesa carga los puntos desde el celular.
5. El cuadro se completa automáticamente hasta definir al campeón.

Cualquiera puede seguir el torneo en vivo desde su link público o entrando a `/en-vivo` para encontrar los torneos activos.

## Para tener en cuenta

Los partidos cargados por QR no requieren cuenta ni contraseña. La seguridad está en que cada QR contiene un token imposible de adivinar.

Las acciones importantes (crear o editar torneos, aprobar organizadores, etc.) están protegidas mediante **Row Level Security (RLS)** de Supabase, no solamente ocultas desde la interfaz.

Si dos mesas terminan exactamente al mismo tiempo, existe una posibilidad muy baja de que se genere un repechaje duplicado. Si ocurre, alcanza con eliminar el registro duplicado desde Supabase.

---

🎴 @truco.cordoba — https://instagram.com/truco.cordoba
