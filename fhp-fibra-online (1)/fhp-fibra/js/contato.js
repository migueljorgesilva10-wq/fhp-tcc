document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#contact-form');
  if (!form) return;
  const assunto = new URLSearchParams(location.search).get('assunto');
  if (assunto) document.querySelector('#assunto').value = assunto;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const feedback = form.querySelector('.form-feedback'), botao = form.querySelector('button[type=submit]');
    let valido = true;
    form.querySelectorAll('[required]').forEach(campo => {
      const invalido = !campo.value.trim() || (campo.type === 'email' && !/^\S+@\S+\.\S+$/.test(campo.value));
      campo.classList.toggle('invalid', invalido);
      if (invalido) valido = false;
    });
    if (!valido) {
      feedback.className = 'form-feedback';
      feedback.textContent = 'Revise os campos destacados antes de enviar.';
      return;
    }
    botao.disabled = true;
    try {
      await fhpApi('/mensagens', { method: 'POST', body: Object.fromEntries(new FormData(form)) });
      form.reset();
      feedback.className = 'form-feedback success';
      feedback.textContent = 'Mensagem enviada com sucesso!';
    } catch (err) {
      feedback.className = 'form-feedback';
      feedback.textContent = err.message;
    } finally { botao.disabled = false; }
  });
});
