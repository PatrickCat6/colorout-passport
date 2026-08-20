export const metadata = {
  title: 'Gallery — Authenticated ColorOut™ Archive',
  description:
    'Browse the permanent archive of authenticated ColorOut™ tattoos by Patrick Cat. Each piece is freehand, fully chromatic, and certified.',
  alternates: {
    canonical: '/gallery',
  },
  openGraph: {
    title: 'ColorOut™ Gallery — Authenticated Archive',
    description:
      'Browse the permanent archive of authenticated ColorOut™ tattoos by Patrick Cat.',
    url: 'https://coloroutpassport.com/gallery',
    images: [{ url: '/hero.jpg', width: 1200, height: 630, alt: 'ColorOut™ Gallery' }],
  },
};

export default function GalleryLayout({ children }) {
  return children;
}
