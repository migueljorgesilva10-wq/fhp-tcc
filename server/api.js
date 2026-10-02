// Rotas /api/* — acesso ao banco via Prisma
const { prisma } = require('./db');
const { confereSenha, novoToken, hashToken } = require('./auth');

const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
const hits = new Map();
function limite(chave, max, ms) {
  const agora = Date.now(), lista = (hits.get(chave) || []).filter(t => agora - t < ms);
  if (lista.length >= max) return false;
  lista.push(agora); hits.set(chave, lista); return true;
}

async function lerCorpo(req) {
  let raw = '';
  for await (const c of req) { raw += c; if (raw.length > 20000) throw Object.assign(new Error('Corpo grande demais.'), { code: 413 }); }
  try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error('JSON inválido.'), { code: 400 }); }
}

async function sessaoDe(req) {
  const m = /^Bearer (\w{64})$/.exec(req.headers.authorization || '');
  if (!m) return null;
  const s = await prisma.sessao.findUnique({ where: { tokenHash: hashToken(m[1]) }, include: { usuario: true } });
  if (!s || s.expiraEm < new Date() || !s.usuario.ativo) return null;
  return { ...s.usuario, tokenHash: s.tokenHash };
}

const txt = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const STATUS_MSG = ['Novo', 'Lida', 'Respondida'];
const STATUS_CHAMADO = ['ABERTO', 'EM_ANDAMENTO', 'RESOLVIDO'];

async function handle(req, res, url) {
  const ip = req.socket.remoteAddress, metodo = req.method;
  const rota = url.replace(/\/+$/, '');

  // ---------- públicas ----------
  if (rota === '/api/login' && metodo === 'POST') {
    if (!limite('login:' + ip, 10, 60000)) return json(res, 429, { error: 'Muitas tentativas. Aguarde um minuto.' });
    const b = await lerCorpo(req);
    const u = await prisma.usuario.findUnique({ where: { usuario: txt(b.usuario, 60).toLowerCase() } });
    if (!u || !u.ativo || !confereSenha(String(b.senha || ''), u.senhaHash)) return json(res, 401, { error: 'Usuário ou senha inválidos.' });
    const token = novoToken();
    const dias = b.lembrar ? 30 : 0.34; // ~8h
    await prisma.sessao.deleteMany({ where: { expiraEm: { lt: new Date() } } });
    await prisma.sessao.create({ data: { tokenHash: hashToken(token), usuarioId: u.id, expiraEm: new Date(Date.now() + dias * 86400000) } });
    return json(res, 200, { token, usuario: u.usuario, nome: u.nome, nivel: u.nivel });
  }

  if (rota === '/api/planos' && metodo === 'GET') {
    return json(res, 200, await prisma.plano.findMany({ where: { ativo: true }, orderBy: [{ categoria: 'asc' }, { ordem: 'asc' }] }));
  }

  if (rota === '/api/mensagens' && metodo === 'POST') {
    if (!limite('msg:' + ip, 5, 60000)) return json(res, 429, { error: 'Muitas mensagens. Aguarde um minuto.' });
    const b = await lerCorpo(req);
    const d = { nome: txt(b.nome, 120), email: txt(b.email, 160), telefone: txt(b.telefone, 40), assunto: txt(b.assunto, 160), texto: txt(b.mensagem, 3000) };
    if (!d.nome || !d.telefone || !d.assunto || !d.texto || !/^\S+@\S+\.\S+$/.test(d.email)) return json(res, 400, { error: 'Preencha todos os campos corretamente.' });
    await prisma.mensagem.create({ data: d });
    return json(res, 201, { ok: true });
  }

  // ---------- autenticadas ----------
  const user = await sessaoDe(req);
  if (!user) return json(res, 401, { error: 'Sessão expirada. Faça login novamente.' });
  const staff = user.nivel === 'admin' || user.nivel === 'funcionario';
  const negar = () => json(res, 403, { error: 'Acesso não permitido.' });

  if (rota === '/api/logout' && metodo === 'POST') {
    await prisma.sessao.deleteMany({ where: { tokenHash: user.tokenHash } });
    return json(res, 200, { ok: true });
  }

  if (rota === '/api/me' && metodo === 'GET') return json(res, 200, { usuario: user.usuario, nome: user.nome, nivel: user.nivel });

  if (rota === '/api/dashboard' && metodo === 'GET') {
    if (user.nivel === 'cliente') {
      const c = await prisma.cliente.findUnique({ where: { usuarioId: user.id }, include: { contratos: { include: { plano: true }, orderBy: { inicioEm: 'desc' }, take: 1 } } });
      const ct = c && c.contratos[0];
      return json(res, 200, { 'Meu plano': ct ? `${ct.plano.velocidade >= 1000 ? ct.plano.velocidade / 1000 + ' Giga' : ct.plano.velocidade + ' Mega'}` : '—', 'Status': ct ? ct.status : '—', 'Chamados': c ? await prisma.chamado.count({ where: { clienteId: c.id } }) : 0 });
    }
    const [clientes, mensagens, chamados] = await Promise.all([prisma.cliente.count(), prisma.mensagem.count(), prisma.chamado.count({ where: { status: { not: 'RESOLVIDO' } } })]);
    if (user.nivel === 'funcionario') return json(res, 200, { 'Clientes': clientes, 'Mensagens': mensagens, 'Chamados abertos': chamados });
    const ativos = await prisma.cliente.count({ where: { contratos: { some: { status: 'ATIVO' } } } });
    return json(res, 200, { 'Clientes': clientes, 'Clientes ativos': ativos, 'Planos': await prisma.plano.count({ where: { ativo: true } }), 'Mensagens': mensagens, 'Chamados abertos': chamados });
  }

  if (rota === '/api/usuarios' && metodo === 'GET') {
    if (user.nivel !== 'admin') return negar();
    return json(res, 200, await prisma.usuario.findMany({ select: { id: true, nome: true, usuario: true, nivel: true, ativo: true }, orderBy: { id: 'asc' } }));
  }

  if (rota === '/api/clientes' && metodo === 'GET') {
    if (!staff) return negar();
    return json(res, 200, await prisma.cliente.findMany({ include: { contratos: { include: { plano: true }, orderBy: { inicioEm: 'desc' }, take: 1 } }, orderBy: { nome: 'asc' } }));
  }

  if (rota === '/api/mensagens' && metodo === 'GET') {
    if (!staff) return negar();
    return json(res, 200, await prisma.mensagem.findMany({ orderBy: { criadoEm: 'desc' }, take: 200 }));
  }

  let m;
  if ((m = /^\/api\/mensagens\/(\d+)$/.exec(rota)) && metodo === 'PATCH') {
    if (!staff) return negar();
    const b = await lerCorpo(req);
    if (!STATUS_MSG.includes(b.status)) return json(res, 400, { error: 'Status inválido.' });
    try { return json(res, 200, await prisma.mensagem.update({ where: { id: +m[1] }, data: { status: b.status } })); }
    catch { return json(res, 404, { error: 'Mensagem não encontrada.' }); }
  }

  if (rota === '/api/chamados' && metodo === 'GET') {
    if (staff) return json(res, 200, await prisma.chamado.findMany({ include: { cliente: { select: { nome: true } }, atendente: { select: { nome: true } } }, orderBy: { criadoEm: 'desc' }, take: 200 }));
    const c = await prisma.cliente.findUnique({ where: { usuarioId: user.id } });
    return json(res, 200, c ? await prisma.chamado.findMany({ where: { clienteId: c.id }, orderBy: { criadoEm: 'desc' } }) : []);
  }

  if (rota === '/api/chamados' && metodo === 'POST') {
    if (user.nivel !== 'cliente') return negar();
    const c = await prisma.cliente.findUnique({ where: { usuarioId: user.id } });
    if (!c) return json(res, 404, { error: 'Cadastro de cliente não encontrado.' });
    const b = await lerCorpo(req);
    const assunto = txt(b.assunto, 160) || 'Solicitação de atendimento', descricao = txt(b.descricao, 3000);
    if (!descricao) return json(res, 400, { error: 'Descreva sua solicitação.' });
    return json(res, 201, await prisma.chamado.create({ data: { clienteId: c.id, assunto, descricao } }));
  }

  if ((m = /^\/api\/chamados\/(\d+)$/.exec(rota)) && metodo === 'PATCH') {
    if (!staff) return negar();
    const b = await lerCorpo(req);
    if (!STATUS_CHAMADO.includes(b.status)) return json(res, 400, { error: 'Status inválido.' });
    try {
      return json(res, 200, await prisma.chamado.update({ where: { id: +m[1] }, data: { status: b.status, atendenteId: user.id, resolvidoEm: b.status === 'RESOLVIDO' ? new Date() : null } }));
    } catch { return json(res, 404, { error: 'Chamado não encontrado.' }); }
  }

  if (rota === '/api/meu-plano' && metodo === 'GET') {
    if (user.nivel !== 'cliente') return negar();
    const c = await prisma.cliente.findUnique({ where: { usuarioId: user.id }, include: { contratos: { include: { plano: true }, orderBy: { inicioEm: 'desc' } } } });
    return json(res, 200, c || null);
  }

  return json(res, 404, { error: 'Rota não encontrada.' });
}

module.exports = async (req, res, url) => {
  try { await handle(req, res, url); }
  catch (e) {
    if (e.code === 400 || e.code === 413) return json(res, e.code, { error: e.message });
    console.error(e); json(res, 500, { error: 'Erro interno do servidor.' });
  }
};
