# Torneo de Truco

Página para organizar torneos de truco 2v2 y 3v3 sin lápiz ni papel. Armás el cuadro, sorteás, y cada mesa anota sus propios puntos desde el celular escaneando un QR — el cuadro general se va actualizando solo.

Incluye repechaje opcional, historial de campeones, y modo claro/oscuro.

## Antes de arrancar

Esto corre sobre Next.js y usa Supabase como base de datos (gratis). Sin eso conectado, la página levanta pero no guarda nada.

### 1. Crear la base en Supabase

- Cuenta en [supabase.com](https://supabase.com) → *New project* → nombre, contraseña, región São Paulo.
- Una vez que levante: *SQL Editor* → *New query* → pegar el contenido de `supabase-schema.sql` → *Run*.
- *Project Settings* → *API* → copiar el **Project URL** y la **anon public key**.

### 2. Correrlo local (opcional)

Con un `.env.local` (mirá `.env.example`) cargado con las dos claves de arriba, y después:

```
npm install
npm run dev
```

### 3. Subir a Vercel

Importar el repo, cargar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Environment Variables, Deploy. El dominio propio se agrega después en Settings → Domains.

## Uso el día del torneo

1. Crear torneo → nombre, lugar, fecha, categoría.
2. Guardar el link de admin que te da (tiene la clave del torneo en la URL).
3. Anotar equipos → Hacer el sorteo.
4. Por cada partido, mostrar el QR a esa mesa. Ellos anotan.
5. El cuadro se completa solo hasta el campeón.

## Para tener en cuenta

No hay usuarios ni contraseñas — la seguridad de cada partido es que el link/QR es imposible de adivinar. No hay que compartir el link de admin con cualquiera.

Si dos mesas terminan un partido justo al mismo tiempo, hay una chance mínima de que el repechaje se duplique. Para un torneo entre amigos no debería pasar nunca, y si pasa se borra el duplicado desde Supabase a mano.

---
🎴 [@truco.cordoba](https://instagram.com/truco.cordoba)
