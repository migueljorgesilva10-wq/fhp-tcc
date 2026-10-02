# FHP Fibra — Projeto demonstrativo

Site institucional e painel da FHP Fibra. Front-end em HTML5, CSS3 e JavaScript puro; back-end em Node.js com **Prisma + SQLite** (banco em `prisma/dev.db`).

## Como executar

1. Instale o [Node.js](https://nodejs.org) (versão 18 ou superior).
2. Copie `.env.example` para `.env` (mantenha a linha `DATABASE_URL`; a chave da Anthropic é opcional).
3. Execute `iniciar.bat` (Windows) ou `./iniciar.sh` (Mac/Linux). Na primeira vez ele roda `npm install` e `npm run setup` (cria o banco e os dados de exemplo).
4. Acesse `http://localhost:3000`.

Comandos úteis: `npm run db:studio` (ver o banco no navegador), `npm run db:reset` (recriar o banco do zero).

## Banco de dados

Tabelas: Usuario, Sessao, Plano, Cliente, Contrato, Chamado, Mensagem (definidas em `prisma/schema.prisma`). Senhas são guardadas com hash (scrypt) e o login gera um token de sessão. A API fica em `server/api.js`.

## Acessos demonstrativos

| Nível | Usuário | Senha |
| --- | --- | --- |
| Admin | `admin` | `admin123` |
| Funcionário | `funcionario` | `123456` |
| Cliente | `cliente` | `123456` |

Os planos, valores, velocidades, tabelas, gráficos e registros são demonstrativos e foram incluídos exclusivamente para apresentação acadêmica. Não representam informações comerciais ou estatísticas oficiais da FHP Fibra.

Os acessos acima são criados pelo seed. O `localStorage` guarda apenas o token da sessão.

## Assistente com IA (opcional)

O assistente do site pode responder qualquer pergunta usando a IA da Anthropic. Sem isso, ele continua funcionando com respostas prontas.

1. Crie uma chave de API em console.anthropic.com.
2. No `.env`, troque `cole-sua-chave-aqui` pela sua chave.
3. Reinicie o servidor.

Nunca coloque a chave nos arquivos `.js` do site nem compartilhe o arquivo `.env`.
