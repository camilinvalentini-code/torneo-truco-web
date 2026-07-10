# Torneo de Truco

Página para organizar torneos de truco 2v2 y 3v3 sin lápiz ni papel. Armás el cuadro, sorteás, y cada mesa anota sus propios puntos desde el celular escaneando un QR — el cuadro general se va actualizando solo, en tiempo real.

Vive en **torneotruco.com.ar**.

## Cómo está armado

Tres tipos de acceso, sin que nadie necesite pasarse links a mano:

- **Admin** — aprueba organizadores nuevos y puede ver/gestionar cualquier torneo.
- **Organizador** (los bares: Vidon, Wort, Bodegón Pirata, etc.) — se registra con su email, pide un link de acceso (sin contraseña), y una vez aprobado maneja sus propios torneos: crea, anota equipos, sortea, reparte los QR. Puede ver en vivo los torneos de otros organizadores, pero no tocarlos.
- **Competidor** — no necesita cuenta. Entra solo con el QR de su mesa, anota sus puntos, y desde ahí también puede ver el fixture completo del torneo.

Repechaje opcional, historial de campeones, modo claro/oscuro, y 4 skins para el tanteador (palitos o fósforos, apilado o lado a lado — cada uno elige la suya, se guarda por dispositivo).

## Antes de arrancar

Corre sobre Next.js con Supabase como base de datos.

### 1. Base en Supabase

- Cuenta en [supabase.com](https://supabase.com) → *New project* → nombre, contraseña, región São Paulo.
- *SQL Editor* → *New query* → pegar el contenido de `supabase-schema.sql` → *Run*.
- Después, pegar y correr también `supabase-schema-v2-roles.sql` (agrega el sistema de cuentas encima).
- *Authentication → Providers*: confirmar que Email esté activo.
- *Authentication → URL Configuration*: Site URL = `https://torneotruco.com.ar`, y agregar `https://torneotruco.com.ar/organizador/panel` en Redirect URLs.
- *Project Settings → API*: copiar el **Project URL** y la **anon/publishable key**.

### 2. Volverte Admin (una sola vez, a mano)

No hay nadie que te pueda aprobar a vos — el primer admin se crea manual:
1. Registrate en `/organizador/acceso` con tu email real.
2. En Supabase → *Table Editor → profiles*, buscá tu fila y cambiá `role` a `admin` y `status` a `aprobado`.
3. De ahí en adelante, aprobás al resto de los organizadores desde tu propio panel en la web.

### 3. Correrlo local (opcional)

Con un `.env.local` (mirá `.env.example`) cargado con las dos claves de Supabase:

```
npm install
npm run dev
```

### 4. Desplegar

Repo en GitHub → importar en Vercel → cargar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Environment Variables → Deploy. El dominio propio se agrega en Settings → Domains, apuntando los nameservers a `ns1.vercel-dns.com` / `ns2.vercel-dns.com` desde el proveedor del dominio.

## Uso el día del torneo

1. El organizador entra a su panel → crea el torneo (nombre, lugar, fecha, categoría).
2. Anota equipos → Hace el sorteo.
3. Por cada partido, muestra el QR a esa mesa. Ellos anotan.
4. El cuadro se completa solo hasta el campeón. Cualquiera puede seguirlo en vivo desde el link público, o desde `/en-vivo` para encontrar torneos sin que le pasen nada.

## Para tener en cuenta

Los partidos (mesa por QR) no tienen cuenta ni contraseña — la seguridad ahí es que el token del link es imposible de adivinar. Las acciones que sí importan (crear/editar un torneo, aprobar organizadores) están protegidas de verdad a nivel de base de datos (Row Level Security de Supabase), no solo escondidas en la interfaz.

Si dos mesas terminan un partido justo al mismo tiempo, hay una chance mínima de que el repechaje se duplique. Para un torneo entre amigos no debería pasar nunca, y si pasa se borra el duplicado desde Supabase a mano.

---
🎴 [@truco.cordoba](https://instagram.com/truco.cordoba)
