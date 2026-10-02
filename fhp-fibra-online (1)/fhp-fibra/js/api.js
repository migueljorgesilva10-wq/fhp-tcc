// Comunicação com o servidor (/api). Funciona também se a página for aberta via file://
(function () {
  // No GitHub Pages usa o servidor online definido em js/config.js; no computador usa localhost.
  const REMOTO = (window.FHP_API_URL || '').replace(/\/+$/, '');
  const BASE = location.protocol === 'file:' ? 'http://localhost:3000' : (REMOTO && /github\.io$/.test(location.hostname) ? REMOTO : '');
  window.fhpApi = async function (caminho, opcoes = {}) {
    const sessao = JSON.parse(localStorage.getItem('fhpSession') || 'null');
    const headers = { 'Content-Type': 'application/json' };
    if (sessao && sessao.token) headers.Authorization = 'Bearer ' + sessao.token;
    let r;
    try {
      r = await fetch(BASE + '/api' + caminho, {
        method: opcoes.method || 'GET', headers,
        body: opcoes.body ? JSON.stringify(opcoes.body) : undefined
      });
    } catch {
      throw Object.assign(new Error('Não foi possível conectar ao servidor. Inicie com iniciar.bat, iniciar.sh ou "node server.js".'), { rede: true });
    }
    const dados = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(dados.error || 'Erro inesperado.'), { status: r.status });
    return dados;
  };
})();
