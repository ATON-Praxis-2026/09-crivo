import type { SVGProps } from 'react';

/**
 * Logotipo CRIVO — vetorial puro, sem depender de fonte carregada.
 *
 * Grade: caixa alta 100, haste 22, anel r_ext 50 / r_int 28.
 * Herda `currentColor`, então serve nos dois temas com um arquivo só (o JPEG
 * que o time enviou tem fundo cinza e não sobrevive ao dark).
 * Dimensione só pela altura; a largura acompanha.
 */
export default function Wordmark({
  height = 22,
  decorative = false,
  ...props
}: SVGProps<SVGSVGElement> & { height?: number; decorative?: boolean }) {
  return (
    <svg
      viewBox="0 0 474 100"
      height={height}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...(decorative
        ? { 'aria-hidden': 'true' as const, focusable: 'false' as const }
        : { role: 'img' as const, 'aria-label': 'CRIVO' })}
      {...props}
    >
      {/* C — anel com abertura reta à direita */}
      <path d="M95.826 30A50 50 0 1 0 95.826 70L69.596 70A28 28 0 1 1 69.596 30Z" />
      {/* R — haste, bojo e perna diagonal (contraforma via evenodd) */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M112 0L177 0A33 33 0 0 1 177 66L210 100L179 100L146 66L134 66L134 100L112 100ZM134 22L177 22A11 11 0 0 1 177 44L134 44Z"
      />
      {/* I */}
      <path d="M228 0L250 0L250 100L228 100Z" />
      {/* V — vértice reto na base */}
      <path d="M266 0L314 100L362 0L338 0L314 50L290 0Z" />
      {/* O */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M374 50A50 50 0 1 0 474 50A50 50 0 1 0 374 50ZM396 50A28 28 0 1 1 452 50A28 28 0 1 1 396 50Z"
      />
    </svg>
  );
}
