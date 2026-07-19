# Torneo de Truco

Organizá torneos de truco sin lápiz ni papel. Armás el cuadro, sorteás, y cada mesa anota sus propios puntos desde el celular escaneando un QR. El cuadro se completa solo hasta el campeón.

🔗 **torneotruco.com.ar**

## Qué tiene

- 1v1, 2v2 y 3v3.
- Tanteador a 15, 20, 30 o 40 puntos, para truco argentino y uruguayo.
- Sorteo automático, con repechaje opcional o el formato "Vidon Bar" (los que pierden van rellenando el cuadro hasta completarlo, sin llave aparte).
- Cruces listos para compartir por WhatsApp, incluso solo los nuevos que van apareciendo durante el torneo.
- Historial de campeones.
- Modo claro/oscuro y varios estilos de tanteador para elegir.
- Anotador libre en `/anotador`, para un partido suelto sin armar torneo.
- Link corto por organizador (`torneotruco.com.ar/t/tu-nombre`), que siempre apunta a tu torneo más reciente.
- Cada organizador entra con su email, sin contraseña la primera vez, y después puede configurar una para compartir la cuenta entre varios celus del mismo bar.

## Cómo se usa

1. Te registrás como organizador, creás el torneo.
2. Cargás los equipos, tocás sortear.
3. Le mostrás el QR a cada mesa. Ellos anotan.
4. El cuadro se arma solo hasta el campeón, cualquiera lo puede seguir en vivo sin que le compartas nada.

## Para levantarlo de cero

Next.js + Supabase. Los `.sql` de este repo se corren en orden en el SQL Editor de Supabase (los archivos están numerados). Las variables de entorno necesarias están en `.env.example`. Deploy en Vercel.

---
🎴 Instagram: [@truco.cordoba](https://instagram.com/truco.cordoba)
