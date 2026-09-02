// QA: validação profunda do JSON final do ranking (modo demonstração).
// Uso: node scripts/qa-validate.mjs <idDaBusca> [porta]
const id = process.argv[2];
const porta = process.argv[3] ?? '3000';
const base = `http://localhost:${porta}`;
const res = await fetch(`${base}/api/rankings/${id}`);
const r = await res.json();
const out = [];
const ok = (nome, cond, ev = '') => out.push(`${cond ? 'PASS' : 'FAIL'} | ${nome}${ev ? ' | ' + ev : ''}`);

const cands = r.categorias.flatMap((c) => c.candidatos);
ok('mock=true', r.mock === true);
ok('status concluida', r.status === 'concluida');
ok('10+ candidatos', cands.length >= 10, `n=${cands.length}`);

// Guardrail: todo achado tem evidenciaUrl OU status nao_verificavel
let semEvidencia = [];
for (const c of cands) for (const a of c.achados ?? []) {
  if (a.status !== 'nao_verificavel' && !a.evidenciaUrl) semEvidencia.push(`${c.nome}/${a.criterio}`);
}
ok('nenhum achado sem evidência (exceto nao_verificavel)', semEvidencia.length === 0, semEvidencia.slice(0,3).join(','));

// Coerência score×tier
let incoerentes = [];
for (const c of cands.filter((x) => x.status === 'concluido')) {
  if (c.score == null || c.tier == null) { incoerentes.push(`${c.nome}:sem score/tier`); continue; }
  if (c.score < 0 || c.score > 100) incoerentes.push(`${c.nome}:score ${c.score}`);
  if (c.eliminatoria && c.tier !== 'EVITAR') incoerentes.push(`${c.nome}:eliminatoria sem EVITAR`);
  if (!c.eliminatoria) {
    const baixaPegada = (c.flags ?? []).includes('pegada_digital_baixa');
    const semCnpj = (c.flags ?? []).includes('cnpj_nao_localizado');
    if (c.score >= 75 && c.tier !== 'VERIFICADO' && !semCnpj) incoerentes.push(`${c.nome}:${c.score} devia VERIFICADO`);
    if (c.score >= 50 && c.score < 75 && c.tier !== 'ATENCAO') incoerentes.push(`${c.nome}:${c.score} devia ATENCAO`);
    if (c.score < 50 && c.tier === 'EVITAR' && (baixaPegada || semCnpj)) incoerentes.push(`${c.nome}:EVITAR com ausência (regra de justiça)`);
  }
}
ok('scores coerentes com tiers e regra de justiça', incoerentes.length === 0, incoerentes.slice(0,5).join(' ; '));

const evitar = cands.filter((c) => c.tier === 'EVITAR');
ok('1+ EVITAR com eliminatória completa', evitar.some((c) => c.eliminatoria?.criterio && c.eliminatoria?.motivo && c.eliminatoria?.evidenciaUrl), evitar.map((c)=>`${c.nome}: ${c.eliminatoria?.motivo}`).join(' ; '));
const adjetivos = /(péssim|horrível|terrível|ruim demais|golpista|desonest|picaret)/i;
ok('linguagem factual no EVITAR (sem adjetivos)', !evitar.some((c) => adjetivos.test(c.eliminatoria?.motivo ?? '') || adjetivos.test(c.justificativa ?? '')));

ok('1+ doCache', cands.some((c) => c.doCache === true), `n=${cands.filter((c)=>c.doCache).length}`);
ok('1+ refinado', cands.some((c) => c.refinado === true), `n=${cands.filter((c)=>c.refinado).length}`);
ok('1+ nao_verificado', cands.some((c) => c.status === 'nao_verificado'));
const semCnpjCase = cands.find((c) => (c.flags ?? []).includes('cnpj_nao_localizado'));
ok('cnpj_nao_localizado → ATENCAO + mensagemAcao', !!semCnpjCase && semCnpjCase.tier === 'ATENCAO' && !!semCnpjCase.mensagemAcao, semCnpjCase?.nome);
ok('naoVerificavel[] presente em concluídos', cands.filter((c)=>c.status==='concluido').every((c) => Array.isArray(c.naoVerificavel)));
ok('justificativa presente e curta', cands.filter((c)=>c.status==='concluido').every((c) => c.justificativa && c.justificativa.length < 400));

// LGPD: nada de pessoa física. Os padrões são ancorados em limite de palavra
// porque a versão solta dava dois falsos positivos legítimos: "cpfCnpj=" é o
// nome do parâmetro do Portal da Transparência, e "Clubes sociais" é descrição
// oficial de CNAE — nenhum dos dois é dado pessoal.
const json = JSON.stringify(r);
const vazamentos = [
  [/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/, 'CPF formatado'],
  [/\*{3}\d{6}\*{2}/, 'CPF mascarado (formato da BrasilAPI)'],
  [/\bs[oó]ci[oa]s?\b/i, 'menção a sócio'],
  [/\bquadro societ[aá]rio\b/i, 'quadro societário'],
  [/\bnome_socio\b|\bqsa\b/i, 'campo de QSA da BrasilAPI'],
  [/\bSrs?\.|\bSra\./, 'tratamento de pessoa'],
].filter(([re]) => re.test(json)).map(([, nome]) => nome);
ok('LGPD: nenhum dado de pessoa física no payload', vazamentos.length === 0, vazamentos.join(', '));

// ---- RN-18: a regra que separa empresa real de exemplo fictício ----
const fs = await import('node:fs');
const seed = JSON.parse(fs.readFileSync('seed/fortaleza.json', 'utf8'));
const reais = new Map();   // nome -> registro real
const ficticios = new Set();
for (const cat of Object.values(seed.categorias)) {
  for (const f of cat.reais ?? []) reais.set(f.nome, f);
  for (const f of cat.ficticios ?? []) ficticios.add(f.nome);
}

// 1. Nenhuma empresa REAL pode receber EVITAR nem falhar a verificação.
const reaisPunidos = cands.filter(
  (c) => reais.has(c.nome) && (c.tier === 'EVITAR' || c.status === 'nao_verificado'),
);
ok('RN-18: nenhuma empresa real em EVITAR ou não verificada', reaisPunidos.length === 0, reaisPunidos.map((c)=>c.nome).join(','));

// 2. Todo EVITAR e toda falha vêm de exemplo fictício declarado no seed.
const negativos = cands.filter((c) => c.tier === 'EVITAR' || c.status === 'nao_verificado');
const negativosNaoDeclarados = negativos.filter((c) => !ficticios.has(c.nome));
ok('RN-18: todo desfecho negativo é fictício declarado', negativosNaoDeclarados.length === 0, negativosNaoDeclarados.map((c)=>c.nome).join(','));

// 3. CNPJ fictício sempre na faixa 99.9xx; CNPJ de empresa real sempre fora dela.
let cnpjErrado = [];
for (const c of cands) {
  const a = (c.achados ?? []).find((x) => x.criterio === 'cnpj_ativo' && x.status !== 'nao_verificavel');
  const m = a?.valor?.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
  if (!m) continue;
  const faixaDemo = m[1].startsWith('99.9');
  if (ficticios.has(c.nome) && !faixaDemo) cnpjErrado.push(`${c.nome}: fictício fora da faixa 99.9`);
  if (reais.has(c.nome) && faixaDemo) cnpjErrado.push(`${c.nome}: real na faixa fictícia`);
  if (reais.has(c.nome) && reais.get(c.nome).cnpj !== m[1]) cnpjErrado.push(`${c.nome}: CNPJ diverge do seed`);
}
ok('CNPJ fictício na faixa 99.9xx e real igual ao seed', cnpjErrado.length === 0, cnpjErrado.slice(0,4).join(' ; '));

// 4. Empresa real precisa exibir evidência clicável de CNPJ e de reputação.
const reaisSemFonte = cands.filter((c) => {
  if (!reais.has(c.nome)) return false;
  const porCrit = new Map((c.achados ?? []).map((a) => [a.criterio, a]));
  const cnpj = porCrit.get('cnpj_ativo');
  return !cnpj?.evidenciaUrl;
});
ok('empresa real tem fonte de CNPJ clicável', reaisSemFonte.length === 0, reaisSemFonte.map((c)=>c.nome).join(','));

// Determinismo: 2 GETs idênticos
const a = await (await fetch(`${base}/api/rankings/${id}`)).text();
const b = await (await fetch(`${base}/api/rankings/${id}`)).text();
ok('determinismo: 2 GETs idênticos pós-conclusão', a === b);

console.log(out.join('\n'));
const nFail = out.filter((l) => l.startsWith('FAIL')).length;
console.log(`\nRESUMO: ${out.filter((l) => l.startsWith('PASS')).length} PASS / ${nFail} FAIL`);
process.exitCode = nFail > 0 ? 1 : 0;
