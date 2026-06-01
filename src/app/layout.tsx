import type { Metadata, Viewport } from 'next';
import './globals.css';
import { InstallPromptBanner } from '@/components/common/InstallPromptBanner';
import { ServiceWorkerRegister } from '@/components/common/ServiceWorkerRegister';

const SITE_URL = 'https://retailmate.io';
const OG_IMAGE = `${SITE_URL}/og/retailmate-og.png?v=5`;

const TITLE = '리테일메이트 | 자영업자 올인원 플랫폼';
const DESCRIPTION =
  '사장님은 숫자만 입력하세요. 정리는 AI가 합니다. 매출·지출·직원·근태·AI 인사이트를 한 곳에서 관리하세요.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s · 리테일메이트',
  },
  description: DESCRIPTION,
  applicationName: '리테일메이트',
  manifest: '/site.webmanifest',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    siteName: '리테일메이트',
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: 'ko_KR',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: '리테일메이트 서비스 소개 이미지',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: '사장님은 숫자만 입력하세요. 정리는 AI가 합니다.',
    images: [OG_IMAGE],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  // iOS PWA — 홈 화면에 추가 시 풀스크린·상태바 톤·전화번호 자동 링크 방지
  appleWebApp: {
    capable: true,
    title: '리테일메이트',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    // 안드로이드 크롬 색
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7FAFC' },
    { media: '(prefers-color-scheme: dark)', color: '#0F172A' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  // PWA 풀스크린에서 노치 영역까지 활용 (safe-area-inset과 함께 작동)
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
        <InstallPromptBanner />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
