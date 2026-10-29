# Instala as skills novas do Office (lista Pasta1.xlsx de 2026-10-29) + Google Maps Scraper Kit.
#
# Uso (PowerShell, na pasta C:\Projetos\ia-office):
#   powershell -ExecutionPolicy Bypass -File scripts\instalar-skills.ps1            # instala
#   powershell -ExecutionPolicy Bypass -File scripts\instalar-skills.ps1 -SoConferir # só mostra o que faria
#
# Segurança: cada repositório é baixado exatamente no commit que foi auditado (SHA fixo abaixo).
# Se alguém mudar o repositório depois, o script continua instalando a versão auditada.
# Skills que já existem com o mesmo nome vão para um backup antes de serem trocadas (nada é apagado).

param([switch]$SoConferir)
$ErrorActionPreference = 'Continue'

$Skills  = Join-Path $env:USERPROFILE '.claude\skills'
$Backup  = Join-Path $env:USERPROFILE ('.claude\skills-backup-' + (Get-Date -Format 'yyyy-MM-dd-HHmm'))
$KitDir  = 'C:\Projetos\google-maps-scraper-kit'
$Tmp     = Join-Path $env:TEMP ('office-skills-' + [guid]::NewGuid().ToString('N').Substring(0, 8))

# [repositório, commit auditado, pasta da skill no repositório, nome instalado, quem usa]
$Lista = @(
  @('https://github.com/anthropics/skills', 'ca45fc496a3436251f191354091d557da31c15b5', 'skills/skill-creator',          'skill-creator',          'Todos'),
  @('https://github.com/anthropics/skills', 'ca45fc496a3436251f191354091d557da31c15b5', 'skills/web-artifacts-builder',  'web-artifacts-builder',  'Todos'),
  @('https://github.com/anthropics/skills', 'ca45fc496a3436251f191354091d557da31c15b5', 'skills/theme-factory',          'theme-factory',          'Leonardo'),
  @('https://github.com/obra/superpowers', '2ce8aa15d05bd57213e6f746f953aafb7ded7a8b', 'skills/using-superpowers',            'using-superpowers',            'Todos'),
  @('https://github.com/obra/superpowers', '2ce8aa15d05bd57213e6f746f953aafb7ded7a8b', 'skills/verification-before-completion','verification-before-completion','Todos'),
  @('https://github.com/obra/superpowers', '2ce8aa15d05bd57213e6f746f953aafb7ded7a8b', 'skills/brainstorming',                'brainstorming',                'Joaquim'),
  @('https://github.com/obra/superpowers', '2ce8aa15d05bd57213e6f746f953aafb7ded7a8b', 'skills/writing-plans',                'writing-plans',                'Líder, Joaquim'),
  @('https://github.com/obra/superpowers', '2ce8aa15d05bd57213e6f746f953aafb7ded7a8b', 'skills/executing-plans',              'executing-plans',              'Líder'),
  @('https://github.com/obra/superpowers', '2ce8aa15d05bd57213e6f746f953aafb7ded7a8b', 'skills/dispatching-parallel-agents',  'dispatching-parallel-agents',  'Líder'),
  @('https://github.com/obra/superpowers', '2ce8aa15d05bd57213e6f746f953aafb7ded7a8b', 'skills/subagent-driven-development',  'subagent-driven-development',  'Líder'),
  @('https://github.com/obra/superpowers', '2ce8aa15d05bd57213e6f746f953aafb7ded7a8b', 'skills/test-driven-development',      'test-driven-development',      'Igor, Luis Felipe'),
  @('https://github.com/obra/superpowers', '2ce8aa15d05bd57213e6f746f953aafb7ded7a8b', 'skills/systematic-debugging',         'systematic-debugging',         'Todos os executores'),
  @('https://github.com/obra/superpowers', '2ce8aa15d05bd57213e6f746f953aafb7ded7a8b', 'skills/requesting-code-review',       'requesting-code-review',       'Lucas'),
  @('https://github.com/obra/superpowers', '2ce8aa15d05bd57213e6f746f953aafb7ded7a8b', 'skills/receiving-code-review',        'receiving-code-review',        'Igor, Leonardo'),
  @('https://github.com/obra/superpowers', '2ce8aa15d05bd57213e6f746f953aafb7ded7a8b', 'skills/writing-skills',               'writing-skills',               'Joaquim'),
  @('https://github.com/mattpocock/skills', 'a496f5513d4a4cf889bc48e189e579f4b0bdf6aa', 'skills/productivity/grill-me', 'grill-me', 'André (comando /grill-me)'),
  @('https://github.com/mattpocock/skills', 'a496f5513d4a4cf889bc48e189e579f4b0bdf6aa', 'skills/productivity/grilling', 'grilling', 'Líder (autointerrogatório)'),
  @('https://github.com/vercel-labs/skills', '92a9a34ac3bf88e695e468b90c7bf32f163d32c8', 'skills/find-skills', 'find-skills', 'Líder'),
  @('https://github.com/nextlevelbuilder/ui-ux-pro-max-skill', '28b3b8dee8c976df4fa3e94aed4e092ad43fcb03', '.claude/skills/ui-ux-pro-max', 'ui-ux-pro-max', 'Leonardo'),
  @('https://github.com/pbakaus/impeccable', '5e745ace7e151feb2a93d360d0281fe39448b857', '.claude/skills/impeccable', 'impeccable', 'Leonardo'),
  @('https://github.com/leonxlnx/taste-skill', '12af471f627f866411b4bd785b19646d3672784c', 'skills/taste-skill', 'taste-skill', 'Leonardo'),
  @('https://github.com/vercel-labs/agent-browser', '1165952d74ceed98fdc2dd97190ad41f44dd0e24', 'skills/agent-browser', 'agent-browser', 'Marina, Luis Felipe'),
  @('https://github.com/Mahanaicoach/google-maps-scraper-kit', '656d66daa269e124d03c7d35a23fa2be2fda8add', '.claude/skills/google-maps-scraper', 'google-maps-scraper', 'Marina (fundamental)')
)
# Fora de propósito: using-git-worktrees e finishing-a-development-branch (Superpowers) fazem commit/merge,
# o que vai contra a regra "só o André faz commits"; diagnosing-superpowers só serve para o plugin.
# context-optimization foi retirada a pedido do André (custa ~4 mil tokens por chamada).

$AgentBrowserVersao = '0.39.1'   # publicada em 2026-10-13; a 0.41.0 saiu hoje e ainda não foi auditada
$GmapsCommit = '656d66daa269e124d03c7d35a23fa2be2fda8add'

function Ok($m)    { Write-Host "  OK  $m" -ForegroundColor Green }
function Aviso($m) { Write-Host "  !!  $m" -ForegroundColor Yellow }
function Erro($m)  { Write-Host "  XX  $m" -ForegroundColor Red }

Write-Host "`n== Office: instalar skills novas ==" -ForegroundColor Cyan
if ($SoConferir) { Write-Host '(modo conferência: nada será alterado)' -ForegroundColor Yellow }

# Pré-requisitos
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Erro 'Git não encontrado. Instale o Git for Windows e rode de novo.'; exit 1 }
$temNpm    = [bool](Get-Command npm -ErrorAction SilentlyContinue)
$temDocker = [bool](Get-Command docker -ErrorAction SilentlyContinue)
$temPython = [bool](Get-Command python -ErrorAction SilentlyContinue) -or [bool](Get-Command py -ErrorAction SilentlyContinue)
if (-not $temNpm)    { Aviso 'Node/npm não encontrado: o programa agent-browser não será instalado (a skill é instalada mesmo assim).' }
if (-not $temDocker) { Aviso 'Docker não encontrado: o Google Maps Scraper precisa do Docker Desktop para rodar (veja o fim).' }
if (-not $temPython) { Aviso 'Python não encontrado: os scripts do Google Maps Scraper e do ui-ux-pro-max precisam dele.' }

$falhas = @(); $instaladas = @(); $trocadas = @()
$baixados = @{}

function Baixar($repo, $sha, $pastas) {
  $dir = Join-Path $Tmp ($repo -replace '[^A-Za-z0-9]', '_')
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  git -C $dir init -q 2>$null
  git -C $dir remote add origin $repo 2>$null
  git -C $dir sparse-checkout set --no-cone @($pastas | ForEach-Object { "/$_/" }) 2>$null
  git -C $dir -c advice.detachedHead=false fetch -q --depth 1 --filter=blob:none origin $sha 2>$null
  if ($LASTEXITCODE -ne 0) { return $null }
  git -C $dir -c advice.detachedHead=false checkout -q FETCH_HEAD 2>$null
  $head = (git -C $dir rev-parse HEAD).Trim()
  if ($head -ne $sha) { return $null }
  return $dir
}

if (-not $SoConferir) { New-Item -ItemType Directory -Force -Path $Skills, $Tmp | Out-Null }

# Agrupa por repositório+commit para baixar cada um uma vez só
$grupos = $Lista | Group-Object { $_[0] + '@' + $_[1] }
foreach ($g in $grupos) {
  $repo = $g.Group[0][0]; $sha = $g.Group[0][1]
  Write-Host "`n> $repo @ $($sha.Substring(0,7))"
  if ($SoConferir) {
    foreach ($s in $g.Group) { Write-Host "    instalaria $($s[3])  ($($s[4]))" }
    continue
  }
  $dir = Baixar $repo $sha ($g.Group | ForEach-Object { $_[2] })
  if (-not $dir) { Erro "não consegui baixar o commit auditado"; $falhas += ($g.Group | ForEach-Object { $_[3] }); continue }
  foreach ($s in $g.Group) {
    $origem = Join-Path $dir ($s[2] -replace '/', '\')
    $destino = Join-Path $Skills $s[3]
    if (-not (Test-Path (Join-Path $origem 'SKILL.md'))) { Erro "$($s[3]): SKILL.md não encontrado"; $falhas += $s[3]; continue }
    if (Test-Path $destino) {
      New-Item -ItemType Directory -Force -Path $Backup | Out-Null
      Move-Item -Force $destino (Join-Path $Backup $s[3])
      $trocadas += $s[3]
    }
    Copy-Item -Recurse -Force $origem $destino
    $testes = Join-Path $destino 'scripts\tests'
    if (Test-Path $testes) { Remove-Item -Recurse -Force $testes }   # testes do autor, não são usados
    Ok "$($s[3])  ($($s[4]))"
    $instaladas += $s[3]
  }
}

# Programa do agent-browser (a skill só funciona com ele instalado)
Write-Host "`n> agent-browser (programa) $AgentBrowserVersao"
if ($SoConferir) { Write-Host "    rodaria: npm install -g agent-browser@$AgentBrowserVersao ; agent-browser install" }
elseif ($temNpm) {
  npm install -g "agent-browser@$AgentBrowserVersao" --no-fund --no-audit
  if ($LASTEXITCODE -eq 0) {
    agent-browser install
    if ($LASTEXITCODE -eq 0) { Ok 'agent-browser instalado (com o navegador dele)' } else { Aviso 'agent-browser instalado, mas o download do navegador falhou: rode "agent-browser install" depois.' }
  } else { Erro 'npm não conseguiu instalar o agent-browser'; $falhas += 'agent-browser (programa)' }
}

# Google Maps Scraper Kit (motor local em Docker + scripts que a skill usa)
Write-Host "`n> Google Maps Scraper Kit em $KitDir"
if ($SoConferir) { Write-Host "    baixaria o kit no commit $($GmapsCommit.Substring(0,7))" }
elseif (Test-Path (Join-Path $KitDir '.git')) {
  git -C $KitDir -c advice.detachedHead=false fetch -q --depth 1 origin $GmapsCommit 2>$null
  git -C $KitDir -c advice.detachedHead=false checkout -q $GmapsCommit 2>$null
  if ($LASTEXITCODE -eq 0) { Ok 'kit já existia, posto no commit auditado' } else { Aviso 'kit já existe, mas não consegui mudar o commit; confira a pasta.' }
} else {
  New-Item -ItemType Directory -Force -Path $KitDir | Out-Null
  git -C $KitDir init -q 2>$null
  git -C $KitDir remote add origin 'https://github.com/Mahanaicoach/google-maps-scraper-kit' 2>$null
  git -C $KitDir -c advice.detachedHead=false fetch -q --depth 1 origin $GmapsCommit 2>$null
  git -C $KitDir -c advice.detachedHead=false checkout -q FETCH_HEAD 2>$null
  if ($LASTEXITCODE -eq 0) { Ok 'kit baixado' } else { Erro 'não consegui baixar o kit'; $falhas += 'google-maps-scraper-kit' }
}

if (-not $SoConferir -and (Test-Path $Tmp)) { Remove-Item -Recurse -Force $Tmp -ErrorAction SilentlyContinue }

Write-Host "`n== Resumo ==" -ForegroundColor Cyan
if ($SoConferir) { Write-Host "Nada foi alterado. Rode sem -SoConferir para instalar."; exit 0 }
Write-Host "Instaladas: $($instaladas.Count) skills em $Skills"
if ($trocadas.Count) { Write-Host "Já existiam e foram trocadas (cópia antiga em $Backup): $($trocadas -join ', ')" }
if ($falhas.Count) { Erro "Falharam: $($falhas -join ', '). Copie esta tela e mande para o Claude." } else { Ok 'Tudo certo.' }
Write-Host "`nPróximos passos:"
Write-Host "  1. Abra o Docker Desktop e rode, uma vez:  cd $KitDir ; docker compose up -d"
Write-Host "  2. Na pasta do Office:  bun run hooks:install ; bun run agentes:aplicar"
Write-Host "  3. Reinicie o Claude Code (claude --office) para ele enxergar as skills novas."
