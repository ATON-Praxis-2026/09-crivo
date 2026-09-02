'use client';

import { useEffect, useRef, useState } from 'react';
import type { RankingResponse } from '@/lib/types';

// Polling do GET /api/rankings/:id a cada 2s (P1 do dossiê — mais simples que SSE).
export function useRanking(id: string, intervalMs = 700) {
  const [data, setData] = useState<RankingResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [erroRede, setErroRede] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let ativo = true;

    async function buscar() {
      try {
        const res = await fetch(`/api/rankings/${id}`, { cache: 'no-store' });
        if (!ativo) return;
        if (res.status === 404) {
          setNotFound(true);
          parar();
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as RankingResponse;
        setErroRede(false);
        setData(json);
        if (json.status !== 'rodando') parar();
      } catch {
        if (ativo) setErroRede(true); // mantém polling: erro transitório de rede
      }
    }

    function parar() {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    }

    buscar();
    timer.current = setInterval(buscar, intervalMs);
    return () => {
      ativo = false;
      parar();
    };
  }, [id, intervalMs]);

  return { data, notFound, erroRede };
}
