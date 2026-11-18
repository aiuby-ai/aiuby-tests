# aiuby-tests

Exemplo público da AIUBY: uma suíte Playwright comum (`tests/`) rodada pelo
[AIUBY Test Automation](https://aiuby.com) no executor gerenciado, contra um alvo com posse verificada.

- **GitHub Action:** `action.yml` e `run.mjs` na raiz. Use `uses: aiuby-ai/aiuby-tests@main` com uma chave
  da API v1 com o escopo `tests:run` guardada como secret do repositório (`AIUBY_API_KEY`). A Action dispara a
  suíte, espera o resultado e falha o job quando a suíte falha. Saídas: `run-id`, `gate` e `url`.
- **Workflow de exemplo:** `.github/workflows/aiuby-tests.yml`, só por disparo manual (`workflow_dispatch`).
- **CLI:** `npx @aiuby-ia/cli tests run` faz o mesmo pela linha de comando.

A configuração do Playwright usa `BASE_URL` (definida pelo executor) e um projeto por navegador (`chromium`).
Nenhum segredo fica neste repositório.
