import type { Metadata, Viewport } from 'next';
import { Sora, Inter, JetBrains_Mono } from 'next/font/google';
import { APP_NAME, isMockMode } from '@/lib/config';
import AppBar from '@/components/AppBar';
import AmbientBackground from '@/components/AmbientBackground';
import './globals.css';

// DS §2.3 — Sora (display), Inter (corpo), JetBrains Mono (score e preço).
const sora = Sora({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-sora', display: 'swap' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: `${APP_NAME} · verificação de fornecedor de evento`,
  description:
    'CRIVO verifica fornecedor de evento corporativo em fontes públicas. CNPJ, reputação e presença digital, com a fonte de cada achado. Relatório privado em PDF.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0D1017' },
    { media: '(prefers-color-scheme: light)', color: '#F6F8FB' },
  ],
};

// DS §3.1 — dark é o padrão para todo mundo; light só se a pessoa escolheu.
// Roda antes do primeiro paint para não piscar o tema errado.
const ANTI_FOUC = `try{if(localStorage.getItem('ap-theme')==='light')document.documentElement.dataset.theme='light'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const mock = isMockMode();
  return (
    <html
      lang="pt-BR"
      className={`${sora.variable} ${inter.variable} ${mono.variable}`}
      /* o script anti-FOUC carimba data-theme antes da hidratação: é a única
         diferença esperada entre o HTML do servidor e o do cliente. */
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANTI_FOUC }} />
      </head>
      <body>
        <AmbientBackground />
        {false && mock && (
          <p className="flag-demo" role="note">
            <IconeDemo />
            Modo demonstração — checagens de Fortaleza já concluídas. Nenhuma empresa real
            recebe <strong>✕ Evitar</strong> aqui: esse caso é sempre um exemplo fictício.
          </p>
        )}
        <AppBar />
        <main>{children}</main>
      </body>
    </html>
  );
}

function IconeDemo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z" />
      <path d="M19 15.5 19.8 17.4 21.7 18.2 19.8 19 19 20.9 18.2 19 16.3 18.2 18.2 17.4 19 15.5Z" />
    </svg>
  );
}
