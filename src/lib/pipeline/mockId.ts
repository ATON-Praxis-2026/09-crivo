// Ids do modo demonstração: 'd_' + base64url(JSON) com o instante de criação,
// cidade, categorias e avisos. O snapshot é derivado só do id + relógio —
// nenhum estado no servidor, o que mantém o demo funcional em serverless frio.

export interface MockIdPayload {
  t: number; // criadoEm (ms epoch)
  cidade: string;
  cats: string[];
  avisos: string[];
}

function toBase64Url(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64url');
}

function fromBase64Url(s: string): string {
  return Buffer.from(s, 'base64url').toString('utf8');
}

export function encodeMockId(p: MockIdPayload): string {
  const compact: MockIdPayload = {
    t: p.t,
    cidade: p.cidade.slice(0, 60),
    cats: p.cats.slice(0, 6),
    avisos: p.avisos.slice(0, 3).map((a) => a.slice(0, 300)),
  };
  return 'd_' + toBase64Url(JSON.stringify(compact));
}

export function isMockId(id: string): boolean {
  return id.startsWith('d_');
}

export function decodeMockId(id: string): MockIdPayload | null {
  if (!isMockId(id)) return null;
  try {
    const raw = JSON.parse(fromBase64Url(id.slice(2))) as Partial<MockIdPayload>;
    if (
      typeof raw.t !== 'number' ||
      typeof raw.cidade !== 'string' ||
      !Array.isArray(raw.cats) ||
      raw.cats.some((c) => typeof c !== 'string')
    ) {
      return null;
    }
    return {
      t: raw.t,
      cidade: raw.cidade,
      cats: raw.cats as string[],
      avisos: Array.isArray(raw.avisos)
        ? (raw.avisos as unknown[]).filter((a): a is string => typeof a === 'string')
        : [],
    };
  } catch {
    return null;
  }
}
