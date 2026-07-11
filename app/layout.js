import "./globals.css";
import { ThemeProvider } from "../lib/theme";
import SiteFooter from "../components/SiteFooter";
import RotatingFavicon from "../components/RotatingFavicon";

export const metadata = {
  title: "Torneo de Truco",
  description: "Organizá torneos de truco 2v2 y 3v3: sorteo automático, cuadro en vivo, anotador por mesa con QR y repechaje.",
  icons: { icon: "/favicon.png" },
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
