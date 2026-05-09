import './globals.css';

export const metadata = {
  title: 'ColorOut™ — Certificate of Authenticity',
  description:
    'ColorOut™ Passport - Certificate of Authenticity System for tattoos by Patrick Cat. Verify your passport and join the collector community.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
