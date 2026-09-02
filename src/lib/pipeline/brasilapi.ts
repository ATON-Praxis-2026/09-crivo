// BrasilAPI — consulta de CNPJ, grátis e sem chave (P1 do dossiê).
// Backoff simples em rate limit; cache em memória por processo.

export interface CnpjInfo {
  numero: string;
  situacao: string;
  aberturaISO: string;
  idadeAnos: number;
  cnae: string;
  cnaeDescricao: string;
  porte: string;
  razaoSocial: string;
  url: string; // evidência
}

const cache = new Map<string, CnpjInfo | null>();

export function limparCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

export async function consultaCnpj(cnpjBruto: string): Promise<CnpjInfo | null> {
  const cnpj = limparCnpj(cnpjBruto);
  if (cnpj.length !== 14) return null;
  if (cache.has(cnpj)) return cache.get(cnpj) ?? null;

  const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 1500 * (tentativa + 1)));
        continue;
      }
      if (!res.ok) {
        cache.set(cnpj, null);
        return null;
      }
      const j = (await res.json()) as Record<string, unknown>;
      const abertura = String(j.data_inicio_atividade ?? '');
      const idadeAnos = abertura
        ? Math.max(0, (Date.now() - new Date(abertura).getTime()) / 31_557_600_000)
        : 0;
      const info: CnpjInfo = {
        numero: cnpj,
        situacao: String(j.descricao_situacao_cadastral ?? j.situacao_cadastral ?? 'DESCONHECIDA').toUpperCase(),
        aberturaISO: abertura,
        idadeAnos: Math.round(idadeAnos * 10) / 10,
        cnae: String(j.cnae_fiscal ?? ''),
        cnaeDescricao: String(j.cnae_fiscal_descricao ?? ''),
        porte: String(j.porte ?? ''),
        razaoSocial: String(j.razao_social ?? ''),
        url,
      };
      cache.set(cnpj, info);
      return info;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return null;
}
