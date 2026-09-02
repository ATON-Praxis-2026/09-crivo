// QA extra: UTF-8, corpos de erro, fase inicial da descoberta.
const id = 'd_eyJ0IjoxNzg4MDYwMzE4NzE2LCJjaWRhZGUiOiJDdXJpdGliYSIsImNhdHMiOlsiYnVmZmV0Il0sImF2aXNvcyI6W119';
const g = await (await fetch('http://localhost:3000/api/rankings/' + id)).json();
console.log('UTF8 nomes:', g.categorias[0].candidatos.slice(0, 3).map((c) => c.nome).join(' | '));
console.log('justificativa exemplo:', g.categorias[0].candidatos.find((c) => c.tier === 'VERIFICADO')?.justificativa);
console.log('naoVerificavel exemplo:', JSON.stringify(g.categorias[0].candidatos.find((c) => c.status === 'concluido')?.naoVerificavel));

const err = await (await fetch('http://localhost:3000/api/rankings', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"cidade":"","categorias":[]}',
})).json();
console.log('erro 400 body:', JSON.stringify(err));
const nf = await (await fetch('http://localhost:3000/api/rankings/nao-existe')).json();
console.log('erro 404 body:', JSON.stringify(nf));

const early = await fetch('http://localhost:3000/api/rankings', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ cidade: 'Curitiba', categorias: ['espaco'], avisos: [] }),
});
const ej = await early.json();
const e1 = await (await fetch('http://localhost:3000/api/rankings/' + ej.id)).json();
console.log(`fase inicial: status=${e1.status} catStatus=${e1.categorias[0].status} cands=${e1.categorias[0].candidatos.length}`);
const headers = await fetch('http://localhost:3000/api/rankings/' + id);
console.log('cache-control:', headers.headers.get('cache-control'));
