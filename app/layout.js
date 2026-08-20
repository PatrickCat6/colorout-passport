import './globals.css';

const siteUrl = 'https://coloroutpassport.com';
const siteName = 'ColorOut™ Passport';
const description =
  'Certificate of Authenticity for ColorOut™ tattoos by Patrick Cat. Verify your passport, explore the archive, and join the collector community.';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ColorOut™ Passport — Certificate of Authenticity',
    template: '%s · ColorOut™ Passport',
  },
  description,
  keywords: [
    'ColorOut',
    'ColorOut Passport',
    'Patrick Cat',
    'tattoo certificate',
    'certificate of authenticity',
    'color tattoo',
    'Neo-Colorphism',
    'Mixi Art Studio',
  ],
  authors: [{ name: 'Patrick Cat' }, { name: 'Mixi Art Studio' }],
  creator: 'Patrick Cat',
  publisher: 'Mixi Art Studio',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName,
    title: 'ColorOut™ Passport — Certificate of Authenticity',
    description,
    images: [
      {
        url: '/hero.jpg',
        width: 1200,
        height: 630,
        alt: 'ColorOut™ Passport by Patrick Cat',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ColorOut™ Passport — Certificate of Authenticity',
    description,
    images: ['/hero.jpg'],
    creator: '@patrickcat_art',
  },
  icons: {
    icon: [
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192x192.png', sizes: '192x192' }],
  },
  manifest: '/manifest.json',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FF0080' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  other: {
    'color-scheme': 'dark light',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: siteName,
  url: siteUrl,
  description,
  applicationCategory: 'ArtApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  creator: {
    '@type': 'Person',
    name: 'Patrick Cat',
    url: 'https://patrickcat.com',
    sameAs: [
      'https://www.instagram.com/patrickcat_art/',
      'https://mixiartstudio.us',
    ],
  },
  publisher: {
    '@type': 'Organization',
    name: 'Mixi Art Studio',
    url: 'https://mixiartstudio.us',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
