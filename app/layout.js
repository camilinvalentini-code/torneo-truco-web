import "./globals.css";
import { ThemeProvider } from "../lib/theme";
import SiteFooter from "../components/SiteFooter";
import RotatingFavicon from "../components/RotatingFavicon";

export const metadata = {
  metadataBase: new URL("https://torneotruco.com.ar"),
  title: "Torneo de Truco",
  description: "Organizá torneos de truco 2v2 y 3v3: sorteo automático, cuadro en vivo, anotador por mesa y repechaje.",
  icons: { icon: "/favicon.png" },
  openGraph: {
    title: "Torneo de Truco",
    description: "El torneo se arma solo. Sorteo automático, cuadro en vivo, anotador en cada mesa.",
    url: "https://torneotruco.com.ar",
    siteName: "Torneo de Truco",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Torneo de Truco",
    description: "El torneo se arma solo. Sorteo automático, cuadro en vivo, anotador en cada mesa.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <RotatingFavicon />
        <ThemeProvider>
          {children}
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
