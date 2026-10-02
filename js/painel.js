(() => {
  const session = JSON.parse(localStorage.getItem('fhpSession') || 'null');
  if (!session || !session.token) { localStorage.removeItem('fhpSession'); location.replace('login.html'); return; }

  const menus = {
    admin: ['dashboard', 'usuarios', 'clientes', 'mensagens', 'planos', 'chamados'],
    funcionario: ['dashboard', 'clientes', 'mensagens', 'chamados', 'consultas'],
    cliente: ['inicio', 'meu-plano', 'meus-dados', 'suporte', 'faturas', 'solicitar-atendimento']
  };
  const labels = { dashboard: 'Dashboard', usuarios: 'Usuários', clientes: 'Clientes', mensagens: 'Mensagens', planos: 'Planos', chamados: 'Chamados', consultas: 'Consultas', inicio: 'Início', 'meu-plano': 'Meu plano', 'meus-dados': 'Meus dados', suporte: 'Suporte', faturas: 'Faturas', 'solicitar-atendimento': 'Solicitar atendimento' };
  const nav = document.querySelector('#panel-nav'), content = document.querySelector('#panel-content');
  const staff = session.nivel !== 'cliente';

  // ---------- utilitários ----------
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const data = d => new Date(d).toLocaleDateString('pt-BR');
  const pill = t => `<span class="pill">${esc(t)}</span>`;
  const mega = v => v >= 1000 ? `${v / 1000} Giga` : `${v} Mega`;
  const reais = v => v == null ? 'Sob consulta' : 'R$ ' + v.toFixed(2).replace('.', ',') + '/mês';
  const statusChamado = s => ({ ABERTO: 'Aberto', EM_ANDAMENTO: 'Em andamento', RESOLVIDO: 'Resolvido' }[s] || s);
  const table = (heads, rows) => `<div class="table-wrap"><table class="data-table"><thead><tr>${heads.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const page = (titulo, corpo) => `<div class="content"><h1>${titulo}</h1><p class="subtitle">Dados carregados do banco de dados da FHP Fibra.</p>${corpo}</div>`;
  const vazio = t => `<p class="empty">${t}</p>`;
  const select = (id, atual, opcoes, rotulo) => `<select data-id="${id}" aria-label="Alterar status">${opcoes.map(o => `<option value="${o}"${o === atual ? ' selected' : ''}>${rotulo ? rotulo(o) : o}</option>`).join('')}</select>`;

  function sair() { localStorage.removeItem('fhpSession'); location.replace('login.html'); }

  // ---------- interface base ----------
  document.querySelector('#user-name').textContent = session.nome;
  document.querySelector('#user-level').textContent = session.nivel;
  document.querySelector('#avatar').textContent = session.nome.split(' ').map(x => x[0]).slice(0, 2).join('');
  menus[session.nivel].forEach((item, i) => {
    const b = document.createElement('button');
    b.textContent = labels[item]; b.dataset.page = item;
    if (!i) b.className = 'active';
    b.onclick = () => render(item);
    nav.append(b);
  });
  document.querySelector('#logout').onclick = async () => { try { await fhpApi('/logout', { method: 'POST' }); } catch {} sair(); };
  document.querySelector('#sidebar-toggle').onclick = () => document.querySelector('.sidebar').classList.toggle('open');

  // ---------- páginas ----------
  async function dashboard() {
    const stats = await fhpApi('/dashboard');
    const cards = Object.entries(stats).map(([k, v]) => `<article class="stat-card"><span>${esc(k)}</span><strong>${esc(v)}</strong></article>`).join('');
    const titulo = session.nivel === 'cliente' ? `Olá, ${esc(session.nome)}!` : 'Visão geral';
    return `<div class="content"><h1>${titulo}</h1><p class="subtitle">Dados reais do banco de dados (Prisma + SQLite).</p><div class="stat-grid">${cards}</div></div>`;
  }

  const paginas = {
    dashboard, inicio: dashboard,

    async usuarios() {
      const l = await fhpApi('/usuarios');
      return page('Usuários', table(['Nome', 'Usuário', 'Nível', 'Status'], l.map(u => [esc(u.nome), esc(u.usuario), esc(u.nivel), pill(u.ativo ? 'Ativo' : 'Inativo')])));
    },

    async clientes() {
      const l = await fhpApi('/clientes');
      return page(labels.clientes, l.length ? table(['Nome', 'E-mail', 'Bairro', 'Plano', 'Status'], l.map(c => {
        const ct = c.contratos[0];
        return [esc(c.nome), esc(c.email || '—'), esc(c.bairro || '—'), esc(ct ? ct.plano.nome : '—'), pill(ct ? ct.status : 'Sem contrato')];
      })) : vazio('Nenhum cliente cadastrado.'));
    },
    consultas() { return this.clientes(); },

    async mensagens() {
      const l = await fhpApi('/mensagens');
      return page('Mensagens', l.length ? table(['Nome', 'E-mail', 'Telefone', 'Assunto', 'Mensagem', 'Data', 'Status'],
        l.map(m => [esc(m.nome), esc(m.email), esc(m.telefone), esc(m.assunto), esc(m.texto), data(m.criadoEm), select(m.id, m.status, ['Novo', 'Lida', 'Respondida'])]))
        : vazio('Ainda não há mensagens. Use o formulário de contato para criar uma.'));
    },

    async planos() {
      const l = await fhpApi('/planos');
      return page('Planos', table(['Nome', 'Velocidade', 'Categoria', 'Valor demonstrativo', 'Status'],
        l.map(p => [esc(p.nome), mega(p.velocidade), p.categoria === 'RESIDENCIAL' ? 'Residencial' : 'Empresarial', reais(p.preco), pill('Ativo')])));
    },

    async chamados() {
      const l = await fhpApi('/chamados');
      return page('Chamados', l.length ? table(['Cliente', 'Assunto', 'Descrição', 'Data', 'Atendente', 'Status'],
        l.map(c => [esc(c.cliente.nome), esc(c.assunto), esc(c.descricao), data(c.criadoEm), esc(c.atendente ? c.atendente.nome : '—'), select(c.id, c.status, ['ABERTO', 'EM_ANDAMENTO', 'RESOLVIDO'], statusChamado)]))
        : vazio('Nenhum chamado registrado.'));
    },

    async 'meu-plano'() {
      const c = await fhpApi('/meu-plano');
      const ct = c && c.contratos[0];
      if (!ct) return page('Meu plano', vazio('Você ainda não possui um plano contratado.'));
      return `<div class="content"><h1>Meu plano</h1><div class="panel-card"><h2>${esc(ct.plano.nome)} — ${mega(ct.plano.velocidade)}</h2><p class="pill">${esc(ct.status)}</p><p>Fibra óptica, Wi-Fi e suporte especializado.</p><p class="subtitle">${reais(ct.plano.preco)} · vencimento dia ${ct.diaVencimento} · desde ${data(ct.inicioEm)}</p></div></div>`;
    },

    async 'meus-dados'() {
      const c = await fhpApi('/meu-plano');
      return page('Meus dados', table(['Campo', 'Informação'], [['Nome', esc(session.nome)], ['Usuário', esc(session.usuario)], ['E-mail', esc(c && c.email || '—')], ['Telefone', esc(c && c.telefone || '—')], ['Bairro', esc(c && c.bairro || '—')], ['Cidade', esc(c && c.cidade || '—')]]));
    },

    async suporte() {
      const l = await fhpApi('/chamados');
      const form = `<form id="chamado-form" class="panel-card"><h2>Abrir solicitação</h2><label>Assunto<input name="assunto" maxlength="160" placeholder="Ex.: Internet lenta"></label><label>Descrição<textarea name="descricao" rows="4" required></textarea></label><p class="form-feedback" role="alert"></p><button class="btn btn-primary" type="submit">Enviar solicitação</button></form>`;
      const lista = l.length ? table(['Assunto', 'Data', 'Status'], l.map(c => [esc(c.assunto), data(c.criadoEm), pill(statusChamado(c.status))])) : vazio('Você ainda não abriu solicitações.');
      return page(labels.suporte, form + '<h2>Minhas solicitações</h2>' + lista);
    },
    'solicitar-atendimento'() { return this.suporte(); },

    async faturas() {
      return page('Faturas', '<div class="notice">Faturas ainda não fazem parte do banco de dados. Em uma aplicação real, seriam integradas a um sistema de cobrança.</div>');
    }
  };

  // ---------- renderização ----------
  let atual = 0;
  async function render(pg) {
    if (!menus[session.nivel].includes(pg)) pg = menus[session.nivel][0];
    const id = ++atual;
    document.querySelectorAll('#panel-nav button').forEach(b => b.classList.toggle('active', b.dataset.page === pg));
    document.querySelector('.sidebar').classList.remove('open');
    content.innerHTML = '<div class="content"><p class="subtitle">Carregando…</p></div>';
    try {
      const html = await paginas[pg].call(paginas);
      if (id !== atual) return;
      content.innerHTML = html;
      ligarEventos(pg);
    } catch (e) {
      if (e.status === 401) return sair();
      if (id === atual) content.innerHTML = `<div class="content"><div class="notice">${esc(e.message)}</div></div>`;
    }
  }

  function ligarEventos(pg) {
    content.querySelectorAll('select[data-id]').forEach(sel => sel.addEventListener('change', async () => {
      sel.disabled = true;
      try { await fhpApi(`/${pg}/${sel.dataset.id}`, { method: 'PATCH', body: { status: sel.value } }); }
      catch (e) { alert(e.message); render(pg); }
      sel.disabled = false;
    }));
    const f = content.querySelector('#chamado-form');
    if (f) f.addEventListener('submit', async e => {
      e.preventDefault();
      const fb = f.querySelector('.form-feedback');
      try {
        await fhpApi('/chamados', { method: 'POST', body: Object.fromEntries(new FormData(f)) });
        render(pg);
      } catch (err) { fb.textContent = err.message; }
    });
  }

  render(menus[session.nivel][0]);
})();
