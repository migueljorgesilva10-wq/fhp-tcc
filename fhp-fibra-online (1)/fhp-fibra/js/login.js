document.addEventListener('DOMContentLoaded', () => {
  if (JSON.parse(localStorage.getItem('fhpSession') || 'null')) location.replace('painel.html');
  const form = document.querySelector('#login-form'), pass = form.senha, show = document.querySelector('.show-password');
  const feedback = form.querySelector('.login-feedback'), botao = form.querySelector('button[type=submit]');

  show.addEventListener('click', () => {
    const visivel = pass.type === 'text';
    pass.type = visivel ? 'password' : 'text';
    show.setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
  });

  document.querySelector('#forgot-password').addEventListener('click', e => {
    e.preventDefault();
    feedback.textContent = 'A recuperação é demonstrativa. Use as credenciais indicadas no README.';
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    feedback.textContent = '';
    botao.disabled = true;
    try {
      const r = await fhpApi('/login', { method: 'POST', body: { usuario: form.usuario.value, senha: pass.value, lembrar: form.lembrar.checked } });
      localStorage.setItem('fhpSession', JSON.stringify({ token: r.token, usuario: r.usuario, nome: r.nome, nivel: r.nivel }));
      location.href = 'painel.html';
    } catch (err) {
      feedback.textContent = err.message;
      botao.disabled = false;
    }
  });
});
