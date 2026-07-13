# Torneo de Truco — web (con base de datos compartida y QR por mesa)

App completa para organizar torneos de truco 2v2/3v3: creación del torneo,
anotación de equipos, sorteo automático, cuadro en vivo, repechaje, e historial
de campeones. Cada partido tiene su propio link/QR: la mesa que juega ese
partido escanea y anota sus puntos desde su propio celular, en tiempo real,
sin poder tocar los partidos de las otras mesas.

Ya se probó que compila (`next build`) sin errores. Lo único que falta para
que funcione de verdad es crear tu base de datos gratis en Supabase y
conectarla — son 10 minutos, pasos abajo.

## Paso 1 — Crear el proyecto en Supabase (gratis)
1. Andá a https://supabase.com → "Start your project" → creá una cuenta
   (podés usar la misma cuenta de GitHub).
2. "New project" → ponele un nombre (ej: `torneo-truco`) → elegí una
   contraseña de base de datos (guardala, no la vas a necesitar de nuevo si
   no la perdés) → región más cercana (ej: São Paulo) → "Create new project".
   Tarda 1-2 minutos en levantar.

## Paso 2 — Crear las tablas
1. En el menú de la izquierda: **SQL Editor** → **New query**.
2. Abrí el archivo `supabase-schema.sql` de este proyecto, copiá todo su
   contenido, pegalo ahí, y tocá **Run**.
3. Deberías ver "Success. No rows returned" — ya están creadas las tablas
   `tournaments`, `teams` y `matches`, con tiempo real activado.

## Paso 3 — Copiar tus claves
1. En Supabase: **Project Settings** (ícono de tuerca) → **API**.
2. Copiá el **Project URL** y la **anon public key**.

## Paso 4 — Conectar el proyecto con esas claves
- **Si vas a probarlo en tu compu primero:**
  Creá un archivo `.env.local` en la raíz del proyecto (mirá `.env.example`
  como modelo) y pegá ahí tu URL y tu anon key. Después:
  ```
  npm install
  npm run dev
  ```
  Abrí http://localhost:3000

- **Si lo subís directo a Vercel (recomendado para el sábado):**
  No hace falta `.env.local`. En Vercel, al importar el proyecto, andá a
  **Environment Variables** y cargá ahí las dos:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Paso 5 — Subir a GitHub y desplegar en Vercel
(Mismos pasos que ya charlamos)
1. Subís esta carpeta a un repositorio nuevo en GitHub.
2. En vercel.com → "Add New Project" → elegís ese repo.
3. Antes de tocar "Deploy", cargás las 2 variables de entorno del Paso 4.
4. "Deploy". En 1-2 minutos tenés tu link público (`*.vercel.app`).
5. Cuando quieras, en Settings → Domains agregás `torneotruco.com.ar` y
   apuntás el DNS desde DonWeb.

## Cómo se usa el día del torneo
1. Entrás a la home → "Crear torneo nuevo" → cargás nombre, lugar, fecha,
   categoría, si tiene repechaje.
2. Te lleva directo al **panel de organizador** (guardá ese link — tiene una
   clave secreta en la URL, es el único que puede tocar el torneo).
3. Anotás los equipos, tocás "Hacer el sorteo".
4. Por cada partido del cuadro, tocás "ver QR" y se lo mostrás/imprimís a esa
   mesa. Ellos escanean y anotan sus propios puntos.
5. Vos (y cualquiera con el link público del torneo) ven el cuadro
   actualizarse solo, partido por partido, hasta el campeón.

## Notas honestas
- No lo pude probar contra una base de datos real desde acá (no tengo forma
  de crear tu cuenta de Supabase), pero sí verifiqué que todo el código
  compila limpio. Los primeros bugs reales van a aparecer recién cuando lo
  uses de verdad — contame apenas los veas y los arreglamos.
- El sistema no tiene contraseñas de usuario: la seguridad de cada partido es
  que su link/QR es un código imposible de adivinar. El panel de organizador
  funciona igual, con su propia clave en la URL. No compartas esos links con
  cualquiera.
- Si dos mesas terminan su partido en el mismo segundo justo, hay una
  posibilidad remota de que el repechaje se genere dos veces. Para un torneo
  chico de amigos es un riesgo bajísimo; si pasara, se soluciona borrando el
  duplicado desde Supabase (te ayudo si llega a pasar).
