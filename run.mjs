// Ação do GitHub do AIUBY Test Automation (lote 26). Sem dependências: dispara a suíte pela API v1
// (POST /api/v1/tests/runs, escopo tests:run), espera o portão (GET /api/v1/tests/runs/<id>) e sai com
// 0 (passou), 1 (falhou) ou 2 (erro de uso, de rede ou tempo esgotado). Escreve o resumo do job e as saídas.
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const POLL_MS = 15_000

class UsageError extends Error {}

export function readInputs(env) {
  const key = (env.AIUBY_API_KEY ?? '').trim()
  if (!key) throw new UsageError('api-key vazia: guarde a chave como secret e passe em with.api-key.')
  const base = (env.AIUBY_BASE_URL || 'https://aiuby.com').replace(/\/+$/, '')
  const loopback = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base) && env.AIUBY_ALLOW_HTTP === '1'
  if (!/^https:\/\/[A-Za-z0-9.-]+(:\d+)?$/.test(base) && !loopback) throw new UsageError('base-url precisa ser https://host.')
  const shards = Number(env.AIUBY_SHARDS || 1)
  if (!Number.isInteger(shards) || shards < 1 || shards > 20) throw new UsageError('shards entre 1 e 20.')
  const minutes = Number(env.AIUBY_TIMEOUT_MINUTES || 30)
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 120) throw new UsageError('timeout-minutes entre 1 e 120.')
  const target = (env.AIUBY_TARGET ?? '').trim()
  const repo = (env.AIUBY_REPO ?? '').trim()
  if (!target || !repo) throw new UsageError('target e repo são obrigatórios.')
  const browsers = (env.AIUBY_BROWSERS || 'chromium').split(',').map((b) => b.trim()).filter(Boolean)
  return {
    key, base, wait: env.AIUBY_WAIT !== 'false', timeoutMs: minutes * 60_000,
    body: { repo, target, ...(env.AIUBY_REF ? { ref: env.AIUBY_REF.trim() } : {}), browsers, shards },
  }
}

async function call(fetchImpl, url, key, init = {}) {
  const response = await fetchImpl(url, { ...init, redirect: 'error', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', 'user-agent': 'aiuby-github-action/1', ...(init.headers ?? {}) } })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`AIUBY respondeu HTTP ${response.status}: ${String(json?.error?.message ?? '').slice(0, 300)}`)
  return json.data
}

function summary(run) {
  const lines = [`### AIUBY Test Automation: ${run.gate === 'passed' ? 'passou' : run.gate === 'failed' ? 'falhou' : 'em andamento'}`, '', `Execução: ${run.url}`]
  if (run.failures?.length) {
    lines.push('', '| Teste | Arquivo | Classificação | Motivo |', '| --- | --- | --- | --- |')
    for (const f of run.failures.slice(0, 30)) lines.push(`| ${esc(f.title)} | ${esc(f.file)} | ${esc(f.classification)} | ${esc(f.reason)} |`)
  }
  return `${lines.join('\n')}\n`
}
const esc = (v) => String(v ?? '').replace(/[|\r\n]/g, ' ').slice(0, 200)

/** Devolve o código de saída. `io` permite trocar fetch, espera e escrita em teste. */
export async function main(env, io = {}) {
  const fetchImpl = io.fetch ?? fetch
  const sleep = io.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
  const log = io.log ?? ((line) => process.stdout.write(`${line}\n`))
  const write = io.write ?? ((file, text) => file && appendFileSync(file, text))
  let inputs
  try {
    inputs = readInputs(env)
  } catch (error) {
    log(`::error::${error.message}`)
    return 2
  }
  log(`::add-mask::${inputs.key}`)
  try {
    let run = await call(fetchImpl, `${inputs.base}/api/v1/tests/runs`, inputs.key, { method: 'POST', body: JSON.stringify(inputs.body) })
    log(`Execução ${run.id} criada: ${run.url}`)
    const until = Date.now() + inputs.timeoutMs
    while (inputs.wait && run.gate === 'pending') {
      if (Date.now() >= until) {
        log(`::error::Tempo esgotado esperando a execução ${run.id}.`)
        write(env.GITHUB_OUTPUT, `run-id=${run.id}\ngate=pending\nurl=${run.url}\n`)
        return 2
      }
      await sleep(POLL_MS)
      run = await call(fetchImpl, `${inputs.base}/api/v1/tests/runs/${encodeURIComponent(run.id)}`, inputs.key)
    }
    write(env.GITHUB_OUTPUT, `run-id=${run.id}\ngate=${run.gate}\nurl=${run.url}\n`)
    write(env.GITHUB_STEP_SUMMARY, summary(run))
    if (run.gate === 'failed') {
      log(`::error::A suíte falhou (${run.failures?.length ?? 0} falha(s) classificada(s)). ${run.url}`)
      return 1
    }
    return 0
  } catch (error) {
    log(`::error::${String(error?.message ?? error).slice(0, 400)}`)
    return 2
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exit(await main(process.env))
