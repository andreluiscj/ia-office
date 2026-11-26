// Office UI language: English by default, plus 8 more. The source strings are English;
// each entry below lists the translation for [pt, es, it, de, fr, zh, ja, hi].
// The choice is saved in localStorage and changing it reloads the page.

export const LANGS = [
  { code: "en", name: "English", locale: "en-US", flag: "us" },
  { code: "pt", name: "Português", locale: "pt-BR", flag: "br" },
  { code: "es", name: "Español", locale: "es-ES", flag: "es" },
  { code: "it", name: "Italiano", locale: "it-IT", flag: "it" },
  { code: "de", name: "Deutsch", locale: "de-DE", flag: "de" },
  { code: "fr", name: "Français", locale: "fr-FR", flag: "fr" },
  { code: "zh", name: "中文", locale: "zh-CN", flag: "cn" },
  { code: "ja", name: "日本語", locale: "ja-JP", flag: "jp" },
  { code: "hi", name: "हिन्दी", locale: "hi-IN", flag: "in" },
];
const ORDER = ["pt", "es", "it", "de", "fr", "zh", "ja", "hi"];

// ---------- font choice (globe button): the default keeps the pixel look; the others replace every UI text, canvas labels included
export const FONTS = [
  { id: "default", name: "Pixelify Sans", css: null },
  { id: "arial", name: "Arial", css: "Arial, 'Helvetica Neue', Helvetica, sans-serif" },
  { id: "times", name: "Times New Roman", css: "'Times New Roman', Times, serif" },
  { id: "calibri", name: "Calibri", css: "Calibri, Carlito, 'Segoe UI', sans-serif" },
];
let fontId = "default";
try { const f = localStorage.getItem("office-font"); if (FONTS.some(x => x.id === f)) fontId = f; } catch {}
function applyFont(id) {
  const f = FONTS.find(x => x.id === id) ?? FONTS[0], root = document.documentElement;
  if (f.css) { root.style.setProperty("--body", f.css); root.style.setProperty("--pixel", f.css); }
  else { root.style.removeProperty("--body"); root.style.removeProperty("--pixel"); }
  window.OFFICE_FONT = f.css ? f.name : null;   // the Office map draws its labels on a canvas and reads this
}
applyFont(fontId);

let saved = null;
try { saved = localStorage.getItem("office-lang"); } catch {}
export const LANG = LANGS.some(l => l.code === saved) ? saved : "en";
export const LOCALE = LANGS.find(l => l.code === LANG).locale;

const D = {
  // status and common
  "Working": ["Trabalhando", "Trabajando", "Al lavoro", "Arbeitet", "Au travail", "工作中", "作業中", "काम कर रहे"],
  "Waiting for you": ["Esperando você", "Esperándote", "Ti aspetta", "Wartet auf dich", "Vous attend", "等待你", "あなたを待っています", "आपका इंतज़ार"],
  "Available": ["Disponível", "Disponible", "Disponibile", "Verfügbar", "Disponible", "空闲", "対応可能", "उपलब्ध"],
  "Idle": ["Parado", "Inactivo", "Inattivo", "Untätig", "Inactif", "空闲", "待機中", "निष्क्रिय"],
  "Done": ["Concluído", "Terminado", "Finito", "Fertig", "Terminé", "已完成", "完了", "पूरा"],
  "Ended": ["Encerrado", "Finalizado", "Chiuso", "Beendet", "Fermé", "已结束", "終了", "समाप्त"],
  "Offline": ["Offline", "Desconectado", "Offline", "Offline", "Hors ligne", "离线", "オフライン", "ऑफ़लाइन"],
  "live": ["ao vivo", "en vivo", "dal vivo", "live", "en direct", "实时", "ライブ", "लाइव"],
  "connecting": ["conectando", "conectando", "connessione", "verbinde", "connexion", "连接中", "接続中", "कनेक्ट हो रहा"],
  "reconnecting": ["reconectando", "reconectando", "riconnessione", "verbinde neu", "reconnexion", "重新连接中", "再接続中", "फिर से कनेक्ट हो रहा"],
  "resetting": ["reiniciando", "reiniciando", "in ripristino", "wird zurückgesetzt", "réinitialisation", "正在重置", "リセット中", "रीसेट हो रहा"],
  "Resets in {t}": ["Reinicia em {t}", "Se reinicia en {t}", "Si azzera tra {t}", "Zurückgesetzt in {t}", "Réinitialisé dans {t}", "{t} 后重置", "{t}後にリセット", "{t} में रीसेट"],
  "Resets {t}": ["Reinicia {t}", "Se reinicia {t}", "Si azzera {t}", "Zurückgesetzt {t}", "Réinitialisé {t}", "{t} 重置", "{t} にリセット", "{t} को रीसेट"],
  "Plan usage shows up after Claude Code's first reply": ["O uso do plano aparece depois da primeira resposta do Claude Code", "El uso del plan aparece tras la primera respuesta de Claude Code", "L'uso del piano compare dopo la prima risposta di Claude Code", "Die Plannutzung erscheint nach der ersten Antwort von Claude Code", "L'utilisation du forfait s'affiche après la première réponse de Claude Code", "Claude Code 首次回复后显示套餐用量", "Claude Code の最初の応答後にプラン使用量が表示されます", "Claude Code के पहले जवाब के बाद प्लान का उपयोग दिखता है"],
  "Current session": ["Sessão atual", "Sesión actual", "Sessione attuale", "Aktuelle Sitzung", "Session actuelle", "当前会话", "現在のセッション", "मौजूदा सत्र"],
  "Weekly": ["Semanal", "Semanal", "Settimanale", "Wöchentlich", "Hebdomadaire", "每周", "週間", "साप्ताहिक"],
  "Monthly": ["Mensal", "Mensual", "Mensile", "Monatlich", "Mensuel", "每月", "月間", "मासिक"],
  "{n} days": ["{n} dias", "{n} días", "{n} giorni", "{n} Tage", "{n} jours", "{n} 天", "{n} 日", "{n} दिन"],
  "Restart task": ["Recomeçar tarefa", "Reiniciar tarea", "Riavvia attività", "Aufgabe neu starten", "Relancer la tâche", "重新开始任务", "タスクを再開", "कार्य फिर शुरू करें"],
  "Cancel task": ["Cancelar tarefa", "Cancelar tarea", "Annulla attività", "Aufgabe abbrechen", "Annuler la tâche", "取消任务", "タスクを中止", "कार्य रद्द करें"],
  "Open Office": ["Abrir office", "Abrir Office", "Apri Office", "Office öffnen", "Ouvrir Office", "打开 Office", "Office を開く", "Office खोलें"],
  "Back": ["Voltar", "Volver", "Indietro", "Zurück", "Retour", "返回", "戻る", "वापस"],
  "Restart this task?": ["Recomeçar esta tarefa?", "¿Reiniciar esta tarea?", "Riavviare questa attività?", "Diese Aufgabe neu starten?", "Relancer cette tâche ?", "重新开始此任务？", "このタスクを再開しますか？", "यह कार्य फिर शुरू करें?"],
  "Cancel this task?": ["Cancelar esta tarefa?", "¿Cancelar esta tarea?", "Annullare questa attività?", "Diese Aufgabe abbrechen?", "Annuler cette tâche ?", "取消此任务？", "このタスクを中止しますか？", "यह कार्य रद्द करें?"],
  "A PowerShell window opens in the project folder with claude --office and continues \"{x}\" from where it stopped.": ["Uma janela do PowerShell abre na pasta do projeto com o claude --office e continua \"{x}\" de onde parou.", "Se abre una ventana de PowerShell en la carpeta del proyecto con claude --office y continúa \"{x}\" donde se quedó.", "Si apre una finestra PowerShell nella cartella del progetto con claude --office e continua \"{x}\" da dove si era fermata.", "Ein PowerShell-Fenster öffnet sich im Projektordner mit claude --office und setzt \"{x}\" dort fort, wo es aufgehört hat.", "Une fenêtre PowerShell s'ouvre dans le dossier du projet avec claude --office et reprend \"{x}\" là où elle s'était arrêtée.", "将在项目文件夹中打开 PowerShell 窗口并运行 claude --office，从中断处继续“{x}”。", "プロジェクトフォルダーで PowerShell が開き、claude --office で「{x}」を中断した所から続けます。", "प्रोजेक्ट फ़ोल्डर में PowerShell खुलेगा और claude --office \"{x}\" को वहीं से जारी रखेगा जहाँ वह रुका था।"],
  "\"{x}\" is marked as cancelled in the vault. A session already running is not interrupted.": ["\"{x}\" é marcada como cancelada no cofre. Uma sessão que já está rodando não é interrompida.", "\"{x}\" se marca como cancelada en la bóveda. Una sesión que ya está en marcha no se interrumpe.", "\"{x}\" viene segnata come annullata nel vault. Una sessione già in corso non viene interrotta.", "\"{x}\" wird im Vault als abgebrochen markiert. Eine bereits laufende Sitzung wird nicht unterbrochen.", "\"{x}\" est marquée comme annulée dans le coffre. Une session déjà en cours n'est pas interrompue.", "“{x}”将在库中标记为已取消。正在运行的会话不会被中断。", "「{x}」は保管庫で中止済みになります。実行中のセッションは中断されません。", "\"{x}\" वॉल्ट में रद्द के रूप में चिह्नित होगा। चल रहा सत्र बाधित नहीं होगा।"],
  "Opening the Office in {x}…": ["Abrindo o Office em {x}…", "Abriendo Office en {x}…", "Apro Office in {x}…", "Office wird in {x} geöffnet…", "Ouverture d'Office dans {x}…", "正在 {x} 中打开 Office…", "{x} で Office を開いています…", "{x} में Office खुल रहा है…"],
  "Task cancelled.": ["Tarefa cancelada.", "Tarea cancelada.", "Attività annullata.", "Aufgabe abgebrochen.", "Tâche annulée.", "任务已取消。", "タスクを中止しました。", "कार्य रद्द किया गया।"],
  "Could not open the Office ({e}).": ["Não consegui abrir o Office ({e}).", "No pude abrir Office ({e}).", "Impossibile aprire Office ({e}).", "Office konnte nicht geöffnet werden ({e}).", "Impossible d'ouvrir Office ({e}).", "无法打开 Office（{e}）。", "Office を開けませんでした（{e}）。", "Office नहीं खुल सका ({e})।"],
  "Could not cancel the task ({e}).": ["Não consegui cancelar a tarefa ({e}).", "No pude cancelar la tarea ({e}).", "Impossibile annullare l'attività ({e}).", "Aufgabe konnte nicht abgebrochen werden ({e}).", "Impossible d'annuler la tâche ({e}).", "无法取消任务（{e}）。", "タスクを中止できませんでした（{e}）。", "कार्य रद्द नहीं हो सका ({e})।"],
  "View finished tasks ({n})": ["Visualizar tarefas concluídas ({n})", "Ver tareas terminadas ({n})", "Vedi attività completate ({n})", "Erledigte Aufgaben anzeigen ({n})", "Voir les tâches terminées ({n})", "查看已完成任务（{n}）", "完了したタスクを表示（{n}）", "पूरे कार्य देखें ({n})"],
  "View cancelled tasks ({n})": ["Visualizar tarefas canceladas ({n})", "Ver tareas canceladas ({n})", "Vedi attività annullate ({n})", "Abgebrochene Aufgaben anzeigen ({n})", "Voir les tâches annulées ({n})", "查看已取消任务（{n}）", "中止したタスクを表示（{n}）", "रद्द कार्य देखें ({n})"],
  "In progress ({n})": ["Em andamento ({n})", "En curso ({n})", "In corso ({n})", "In Arbeit ({n})", "En cours ({n})", "进行中（{n}）", "進行中（{n}）", "जारी ({n})"],
  "Progress": ["Progresso", "Progreso", "Avanzamento", "Fortschritt", "Progression", "进度", "進捗", "प्रगति"],
  "Estimated from the status of each task": ["Estimado pelo status de cada tarefa", "Estimado por el estado de cada tarea", "Stimato dallo stato di ogni attività", "Geschätzt aus dem Status jeder Aufgabe", "Estimé d'après le statut de chaque tâche", "根据每个任务的状态估算", "各タスクの状態から推定", "प्रत्येक कार्य की स्थिति से अनुमानित"],
  "Nothing in progress.": ["Nada em andamento.", "Nada en curso.", "Niente in corso.", "Nichts in Arbeit.", "Rien en cours.", "没有进行中的任务。", "進行中のものはありません。", "कुछ भी जारी नहीं है।"],
  "Font": ["Fonte", "Fuente", "Carattere", "Schriftart", "Police", "字体", "フォント", "फ़ॉन्ट"],
  "(default)": ["(padrão)", "(predeterminada)", "(predefinito)", "(Standard)", "(par défaut)", "（默认）", "（既定）", "(डिफ़ॉल्ट)"],
  "Tasks": ["Tarefas", "Tareas", "Attività", "Aufgaben", "Tâches", "任务", "タスク", "कार्य"],
  "Used up": ["Esgotado", "Agotado", "Esaurito", "Aufgebraucht", "Épuisé", "已用完", "上限到達", "समाप्त"],
  "Back {t}": ["Volta {t}", "Vuelve {t}", "Torna {t}", "Zurück {t}", "Retour {t}", "恢复于 {t}", "{t} に復帰", "{t} को वापस"],
  "Codex usage shows up after its first run": ["O uso do Codex aparece depois do primeiro uso", "El uso de Codex aparece tras su primer uso", "L'utilizzo di Codex appare dopo il primo uso", "Codex-Nutzung erscheint nach dem ersten Lauf", "L'utilisation de Codex apparaît après sa première exécution", "首次运行后显示 Codex 用量", "Codex の使用量は初回実行後に表示", "पहली बार चलाने के बाद Codex उपयोग दिखेगा"],
  "Your Codex usage limits, read from its session logs": ["Limites de uso do Codex, lidos dos registros de sessão dele", "Límites de uso de Codex, leídos de sus registros de sesión", "Limiti di utilizzo di Codex, letti dai suoi log di sessione", "Codex-Nutzungslimits aus seinen Sitzungsprotokollen", "Limites d'utilisation de Codex, lues dans ses journaux de session", "Codex 用量上限，读取自其会话日志", "Codex の使用上限（セッションログから取得）", "Codex उपयोग सीमा, उसके सत्र लॉग से"],
  "Work queue": ["Fila de trabalho", "Cola de trabajo", "Coda di lavoro", "Arbeitswarteschlange", "File de travail", "工作队列", "作業キュー", "काम की कतार"],
  "Requests": ["Pedidos", "Solicitudes", "Richieste", "Anfragen", "Demandes", "请求", "依頼", "अनुरोध"],
  "Inbox": ["Caixa de entrada", "Bandeja de entrada", "In arrivo", "Eingang", "Boîte de réception", "收件箱", "受信箱", "इनबॉक्स"],
  "Open tasks": ["Tarefas abertas", "Tareas abiertas", "Attività aperte", "Offene Aufgaben", "Tâches ouvertes", "未完成任务", "未完了タスク", "खुले कार्य"],
  "Finished": ["Concluídas", "Terminadas", "Completate", "Erledigt", "Terminées", "已完成", "完了", "पूरे"],
  "Blocked": ["Bloqueadas", "Bloqueadas", "Bloccate", "Blockiert", "Bloquées", "受阻", "ブロック", "रुके हुए"],
  "Owner": ["Responsável", "Responsable", "Responsabile", "Zuständig", "Responsable", "负责人", "担当", "ज़िम्मेदार"],
  "Depends on": ["Depende de", "Depende de", "Dipende da", "Hängt ab von", "Dépend de", "依赖", "依存", "निर्भर"],
  "Brief": ["Briefing", "Briefing", "Brief", "Auftrag", "Brief", "任务说明", "指示", "ब्रीफ़"],
  "Result": ["Resultado", "Resultado", "Risultato", "Ergebnis", "Résultat", "结果", "結果", "परिणाम"],
  "Decisions": ["Decisões", "Decisiones", "Decisioni", "Entscheidungen", "Décisions", "决定", "決定事項", "निर्णय"],
  "Request": ["Pedido", "Solicitud", "Richiesta", "Anfrage", "Demande", "请求", "依頼", "अनुरोध"],
  "Project": ["Projeto", "Proyecto", "Progetto", "Projekt", "Projet", "项目", "プロジェクト", "प्रोजेक्ट"],
  "updated {t}": ["atualizado {t}", "actualizado {t}", "aggiornato {t}", "aktualisiert {t}", "mis à jour {t}", "更新于 {t}", "{t} に更新", "{t} अपडेट"],
  "No requests yet. Write one in the vault's 00-Pedidos folder.": ["Nenhum pedido ainda. Escreva um na pasta 00-Pedidos do cofre.", "Aún no hay solicitudes. Escribe una en la carpeta 00-Pedidos de la bóveda.", "Nessuna richiesta. Scrivine una nella cartella 00-Pedidos del vault.", "Noch keine Anfragen. Schreib eine in den Ordner 00-Pedidos des Vaults.", "Aucune demande. Écrivez-en une dans le dossier 00-Pedidos du coffre.", "还没有请求。在库的 00-Pedidos 文件夹中写一个。", "依頼はまだありません。保管庫の 00-Pedidos フォルダーに書いてください。", "अभी कोई अनुरोध नहीं। वॉल्ट के 00-Pedidos फ़ोल्डर में लिखें।"],
  "No Obsidian vault is set. Fill the cofre field in company/empresa.json.": ["Nenhum cofre do Obsidian configurado. Preencha o campo cofre em company/empresa.json.", "No hay bóveda de Obsidian. Completa el campo cofre en company/empresa.json.", "Nessun vault di Obsidian. Compila il campo cofre in company/empresa.json.", "Kein Obsidian-Vault gesetzt. Fülle das Feld cofre in company/empresa.json.", "Aucun coffre Obsidian. Remplissez le champ cofre dans company/empresa.json.", "未设置 Obsidian 库。请填写 company/empresa.json 中的 cofre 字段。", "Obsidian 保管庫が未設定です。company/empresa.json の cofre を設定してください。", "Obsidian वॉल्ट सेट नहीं है। company/empresa.json में cofre भरें।"],
  "Search tasks": ["Buscar tarefas", "Buscar tareas", "Cerca attività", "Aufgaben suchen", "Rechercher des tâches", "搜索任务", "タスクを検索", "कार्य खोजें"],
  "only open work": ["só trabalho aberto", "solo trabajo abierto", "solo lavoro aperto", "nur offene Arbeit", "seulement le travail ouvert", "仅未完成", "未完了のみ", "केवल खुला काम"],
  "Click a request to see its tasks.": ["Clique num pedido para ver as tarefas.", "Haz clic en una solicitud para ver sus tareas.", "Fai clic su una richiesta per vederne le attività.", "Klicke auf eine Anfrage, um ihre Aufgaben zu sehen.", "Cliquez sur une demande pour voir ses tâches.", "点击一个请求查看其任务。", "依頼をクリックするとタスクが表示されます。", "कार्य देखने के लिए अनुरोध पर क्लिक करें।"],
  "{n} tasks": ["{n} tarefas", "{n} tareas", "{n} attività", "{n} Aufgaben", "{n} tâches", "{n} 个任务", "{n} 件のタスク", "{n} कार्य"],
  "Could not fetch the tasks ({e}).": ["Não consegui buscar as tarefas ({e}).", "No pude obtener las tareas ({e}).", "Impossibile caricare le attività ({e}).", "Aufgaben konnten nicht geladen werden ({e}).", "Impossible de charger les tâches ({e}).", "无法获取任务（{e}）。", "タスクを取得できませんでした（{e}）。", "कार्य नहीं मिल सके ({e})।"],
  "Your Claude plan usage limits, the same as Settings › Usage": ["Limites de uso do seu plano do Claude, os mesmos de Configurações › Uso", "Límites de uso de tu plan de Claude, los mismos de Ajustes › Uso", "Limiti di utilizzo del tuo piano Claude, gli stessi di Impostazioni › Utilizzo", "Nutzungslimits deines Claude-Plans, wie unter Einstellungen › Nutzung", "Limites d'utilisation de votre forfait Claude, comme dans Paramètres › Utilisation", "你的 Claude 套餐用量上限，与 设置 › 用量 相同", "Claude プランの使用上限（設定 › 使用量 と同じ）", "आपके Claude प्लान की उपयोग सीमा, सेटिंग्स › उपयोग जैसी"],
  "Office": ["Escritório", "Oficina", "Ufficio", "Büro", "Bureau", "办公室", "オフィス", "ऑफ़िस"],
  "Skills": ["Skills", "Skills", "Skill", "Skills", "Skills", "技能", "スキル", "स्किल्स"],
  "Language": ["Idioma", "Idioma", "Lingua", "Sprache", "Langue", "语言", "言語", "भाषा"],

  // office floor
  "Zoom in": ["Aproximar", "Acercar", "Ingrandisci", "Vergrößern", "Zoom avant", "放大", "拡大", "ज़ूम इन"],
  "Zoom out": ["Afastar", "Alejar", "Riduci", "Verkleinern", "Zoom arrière", "缩小", "縮小", "ज़ूम आउट"],
  "See the whole floor": ["Ver o andar inteiro", "Ver toda la planta", "Vedi tutto il piano", "Ganze Etage zeigen", "Voir tout l'étage", "查看整层", "フロア全体を表示", "पूरी मंज़िल देखें"],
  "Drag to move · mouse wheel to zoom · click a person for details": ["Arraste para mover · roda do mouse para zoom · clique numa pessoa para ver detalhes", "Arrastra para mover · rueda para zoom · haz clic en una persona para ver detalles", "Trascina per spostarti · rotella per lo zoom · clicca una persona per i dettagli", "Ziehen zum Bewegen · Mausrad zum Zoomen · Person anklicken für Details", "Glissez pour bouger · molette pour zoomer · cliquez sur une personne pour les détails", "拖动移动 · 滚轮缩放 · 点击人物查看详情", "ドラッグで移動 · ホイールでズーム · 人をクリックで詳細", "हिलाने के लिए खींचें · ज़ूम के लिए माउस व्हील · विवरण के लिए किसी व्यक्ति पर क्लिक करें"],
  "Meeting room": ["Sala de reunião", "Sala de reuniones", "Sala riunioni", "Besprechungsraum", "Salle de réunion", "会议室", "会議室", "मीटिंग रूम"],
  "Lead": ["Líder", "Líder", "Responsabile", "Leitung", "Responsable", "负责人", "リーダー", "लीड"],
  "Leadership": ["Liderança", "Liderazgo", "Direzione", "Leitung", "Direction", "领导层", "リーダーシップ", "नेतृत्व"],
  "Engineering & Testing": ["Engenharia e Testes", "Ingeniería y Pruebas", "Ingegneria e Test", "Entwicklung & Tests", "Ingénierie et Tests", "工程与测试", "開発とテスト", "इंजीनियरिंग और टेस्टिंग"],
  "Free desks": ["Mesas livres", "Mesas libres", "Scrivanie libere", "Freie Plätze", "Bureaux libres", "空闲工位", "フリーデスク", "खाली डेस्क"],
  "Contractors": ["Terceirizados", "Externos", "Esterni", "Externe", "Prestataires", "外包", "外部メンバー", "ठेकेदार"],
  "contractor": ["terceirizado", "externo", "esterno", "extern", "prestataire", "外包", "外部メンバー", "ठेकेदार"],
  "LOUNGE": ["AREA COMUM", "ZONA COMUN", "AREA RELAX", "LOUNGE", "ESPACE DETENTE", "休息区", "ラウンジ", "लाउंज"],
  "KITCHEN": ["COPA", "COCINA", "CUCINA", "KUECHE", "CUISINE", "茶水间", "キッチン", "रसोई"],
  "elevator": ["elevador", "ascensor", "ascensore", "Aufzug", "ascenseur", "电梯", "エレベーター", "लिफ़्ट"],
  "walking to the room": ["indo para a sala", "yendo a la sala", "va verso la stanza", "geht zum Raum", "va vers la salle", "正走向房间", "部屋へ移動中", "कमरे की ओर जा रहे"],
  "walking": ["andando", "caminando", "cammina", "unterwegs", "marche", "走动中", "歩いています", "चल रहे"],
  "in their own room": ["na própria sala", "en su sala", "nella propria stanza", "im eigenen Raum", "dans son bureau", "在自己的房间", "自分の部屋", "अपने कमरे में"],
  "at the free desks": ["nas mesas livres", "en las mesas libres", "alle scrivanie libere", "an den freien Plätzen", "aux bureaux libres", "在空闲工位", "フリーデスク", "खाली डेस्क पर"],
  "at their own desk": ["na própria mesa", "en su mesa", "alla propria scrivania", "am eigenen Platz", "à son bureau", "在自己的工位", "自分のデスク", "अपनी डेस्क पर"],
  "in the kitchen": ["na copa", "en la cocina", "in cucina", "in der Küche", "à la cuisine", "在茶水间", "キッチン", "रसोई में"],
  "on the sofa": ["no sofá", "en el sofá", "sul divano", "auf dem Sofa", "sur le canapé", "在沙发上", "ソファ", "सोफ़े पर"],
  "on the beanbags": ["nos pufes", "en los pufs", "sui pouf", "auf den Sitzsäcken", "sur les poufs", "在懒人沙发上", "ビーズクッション", "बीनबैग पर"],
  "in the meeting room": ["na sala de reunião", "en la sala de reuniones", "in sala riunioni", "im Besprechungsraum", "en salle de réunion", "在会议室", "会議室", "मीटिंग रूम में"],
  "at the whiteboard": ["no quadro branco", "en la pizarra", "alla lavagna", "am Whiteboard", "au tableau blanc", "在白板前", "ホワイトボード", "व्हाइटबोर्ड पर"],
  "at ping-pong": ["no pingue-pongue", "en el ping-pong", "al ping-pong", "beim Tischtennis", "au ping-pong", "在打乒乓球", "卓球", "पिंग-पोंग पर"],
  "at the water cooler": ["no bebedouro", "en el dispensador de agua", "al distributore d'acqua", "am Wasserspender", "à la fontaine à eau", "在饮水机旁", "ウォーターサーバー", "वॉटर कूलर पर"],
  "by the window": ["na janela", "junto a la ventana", "alla finestra", "am Fenster", "près de la fenêtre", "在窗边", "窓際", "खिड़की के पास"],
  "in the lounge": ["na área comum", "en la zona común", "nell'area relax", "in der Lounge", "dans l'espace détente", "在休息区", "ラウンジ", "लाउंज में"],
  "Current model": ["Modelo agora", "Modelo actual", "Modello attuale", "Aktuelles Modell", "Modèle actuel", "当前模型", "現在のモデル", "मौजूदा मॉडल"],
  "no data yet": ["sem dados ainda", "aún sin datos", "ancora nessun dato", "noch keine Daten", "pas encore de données", "暂无数据", "まだデータなし", "अभी डेटा नहीं"],
  "none yet": ["nenhuma ainda", "ninguna aún", "ancora nessuna", "noch keine", "aucune pour l'instant", "暂无", "まだなし", "अभी कोई नहीं"],
  "none": ["nenhum", "ninguno", "nessuno", "keine", "aucun", "无", "なし", "कोई नहीं"],
  "No project": ["Sem projeto", "Sin proyecto", "Nessun progetto", "Kein Projekt", "Aucun projet", "无项目", "プロジェクトなし", "कोई प्रोजेक्ट नहीं"],
  "Status": ["Status", "Estado", "Stato", "Status", "Statut", "状态", "ステータス", "स्थिति"],
  "Where": ["Onde está", "Dónde está", "Dove si trova", "Wo", "Où", "位置", "場所", "कहाँ"],
  "Role": ["Função", "Función", "Ruolo", "Rolle", "Rôle", "职责", "役割", "भूमिका"],
  "Main Claude Code session. Takes your requests, delegates to the team and delivers the result.": ["Sessão principal do Claude Code. Recebe seus pedidos, delega para a equipe e entrega o resultado.", "Sesión principal de Claude Code. Recibe tus pedidos, delega al equipo y entrega el resultado.", "Sessione principale di Claude Code. Riceve le tue richieste, delega al team e consegna il risultato.", "Hauptsitzung von Claude Code. Nimmt deine Anfragen an, delegiert ans Team und liefert das Ergebnis.", "Session principale de Claude Code. Reçoit vos demandes, délègue à l'équipe et livre le résultat.", "Claude Code 主会话。接收你的请求，分派给团队并交付结果。", "Claude Code のメインセッション。依頼を受け、チームに割り振り、結果を届けます。", "Claude Code का मुख्य सत्र। आपके अनुरोध लेता है, टीम को सौंपता है और नतीजा देता है।"],
  "Usage by model": ["Uso por modelo", "Uso por modelo", "Uso per modello", "Nutzung nach Modell", "Utilisation par modèle", "按模型用量", "モデル別の使用量", "मॉडल के अनुसार उपयोग"],
  "Ongoing projects": ["Projetos em andamento", "Proyectos en curso", "Progetti in corso", "Laufende Projekte", "Projets en cours", "进行中的项目", "進行中のプロジェクト", "चल रहे प्रोजेक्ट"],
  "Department": ["Setor", "Área", "Reparto", "Abteilung", "Service", "部门", "部署", "विभाग"],
  "Now": ["Agora", "Ahora", "Ora", "Jetzt", "Maintenant", "当前", "現在", "अभी"],
  "using {x}": ["usando {x}", "usando {x}", "usa {x}", "nutzt {x}", "utilise {x}", "正在使用 {x}", "{x} を使用中", "{x} का उपयोग"],
  "Last work": ["Último trabalho", "Último trabajo", "Ultimo lavoro", "Letzte Arbeit", "Dernier travail", "最近工作", "最後の作業", "पिछला काम"],
  "{t} ago in {p}": ["há {t} em {p}", "hace {t} en {p}", "{t} fa in {p}", "vor {t} in {p}", "il y a {t} dans {p}", "{t} 前，在 {p}", "{t}前（{p}）", "{t} पहले {p} में"],
  "Tasks (7 days)": ["Tarefas (7 dias)", "Tareas (7 días)", "Attività (7 giorni)", "Aufgaben (7 Tage)", "Tâches (7 jours)", "任务（7 天）", "タスク（7日間）", "काम (7 दिन)"],
  "Agent": ["Agente", "Agente", "Agente", "Agent", "Agent", "代理", "エージェント", "एजेंट"],
  "Most used skills": ["Skills mais usadas", "Skills más usadas", "Skill più usate", "Meistgenutzte Skills", "Skills les plus utilisés", "最常用技能", "よく使うスキル", "सबसे ज़्यादा इस्तेमाल स्किल्स"],
  "Most used tools": ["Ferramentas mais usadas", "Herramientas más usadas", "Strumenti più usati", "Meistgenutzte Werkzeuge", "Outils les plus utilisés", "最常用工具", "よく使うツール", "सबसे ज़्यादा इस्तेमाल टूल"],
  "Project": ["Projeto", "Proyecto", "Progetto", "Projekt", "Projet", "项目", "プロジェクト", "प्रोजेक्ट"],
  "Task": ["Tarefa", "Tarea", "Attività", "Aufgabe", "Tâche", "任务", "タスク", "काम"],
  "Using": ["Usando", "Usando", "Usa", "Nutzt", "Utilise", "正在使用", "使用中", "उपयोग में"],
  "A subagent that is not on the company roster (for example, Claude Code's built-in ones).": ["Subagente que não faz parte do quadro da empresa (por exemplo, os embutidos do Claude Code).", "Subagente que no forma parte de la plantilla (por ejemplo, los integrados de Claude Code).", "Subagente che non fa parte dell'organico (ad esempio quelli integrati di Claude Code).", "Subagent, der nicht zum Team gehört (z. B. die eingebauten von Claude Code).", "Sous-agent hors effectif de l'entreprise (par exemple ceux intégrés à Claude Code).", "不在公司编制内的子代理（例如 Claude Code 内置的）。", "社員名簿にないサブエージェント（Claude Code 組み込みなど）。", "ऐसा सब-एजेंट जो कंपनी की टीम में नहीं है (जैसे Claude Code के बिल्ट-इन)।"],
  "Close": ["Fechar", "Cerrar", "Chiudi", "Schließen", "Fermer", "关闭", "閉じる", "बंद करें"],
  "Hooks have not sent any event yet: open a new Claude Code session.": ["Os hooks ainda não mandaram nenhum evento: abra uma sessão nova do Claude Code.", "Los hooks aún no enviaron eventos: abre una nueva sesión de Claude Code.", "Gli hook non hanno ancora inviato eventi: apri una nuova sessione di Claude Code.", "Die Hooks haben noch kein Ereignis gesendet: Öffne eine neue Claude-Code-Sitzung.", "Les hooks n'ont encore envoyé aucun événement : ouvrez une nouvelle session Claude Code.", "钩子尚未发送任何事件：请打开新的 Claude Code 会话。", "フックからまだイベントがありません。新しい Claude Code セッションを開いてください。", "हुक्स ने अभी तक कोई इवेंट नहीं भेजा: Claude Code का नया सत्र खोलें।"],
  "Last Claude Code signal: {t} ago.": ["Último sinal do Claude Code: há {t}.", "Última señal de Claude Code: hace {t}.", "Ultimo segnale di Claude Code: {t} fa.", "Letztes Signal von Claude Code: vor {t}.", "Dernier signal de Claude Code : il y a {t}.", "Claude Code 最后信号：{t} 前。", "Claude Code の最終シグナル：{t}前。", "Claude Code का आख़िरी सिग्नल: {t} पहले।"],
  "No project running.": ["Nenhum projeto rodando.", "Ningún proyecto en marcha.", "Nessun progetto in corso.", "Kein Projekt läuft.", "Aucun projet en cours.", "没有正在运行的项目。", "実行中のプロジェクトはありません。", "कोई प्रोजेक्ट नहीं चल रहा।"],
  "The team is in the lounge and kitchen.": ["A equipe está na área comum e na copa.", "El equipo está en la zona común y la cocina.", "Il team è nell'area relax e in cucina.", "Das Team ist in der Lounge und der Küche.", "L'équipe est à l'espace détente et à la cuisine.", "团队在休息区和茶水间。", "チームはラウンジとキッチンにいます。", "टीम लाउंज और रसोई में है।"],
  "{n} of {total} employees working.": ["{n} de {total} funcionários trabalhando.", "{n} de {total} empleados trabajando.", "{n} di {total} dipendenti al lavoro.", "{n} von {total} Mitarbeitenden arbeiten.", "{n} sur {total} employés au travail.", "{total} 名员工中有 {n} 名在工作。", "{total} 人中 {n} 人が作業中。", "{total} में से {n} कर्मचारी काम कर रहे हैं।"],
  "Active projects: {x}.": ["Projetos ativos: {x}.", "Proyectos activos: {x}.", "Progetti attivi: {x}.", "Aktive Projekte: {x}.", "Projets actifs : {x}.", "活跃项目：{x}。", "進行中のプロジェクト：{x}。", "सक्रिय प्रोजेक्ट: {x}।"],
  "Lead's task": ["Tarefa do Líder", "Tarea del líder", "Compito del responsabile", "Aufgabe der Leitung", "Tâche du responsable", "负责人分派的任务", "リーダーのタスク", "लीड का काम"],
  "Agents talking": ["Agentes conversando", "Agentes conversando", "Agenti che parlano", "Agenten im Gespräch", "Agents en discussion", "代理之间交流", "会話中のエージェント", "बात कर रहे एजेंट"],

  // dashboard
  "Period": ["Período", "Periodo", "Periodo", "Zeitraum", "Période", "时间段", "期間", "अवधि"],
  "Today": ["Hoje", "Hoy", "Oggi", "Heute", "Aujourd'hui", "今天", "今日", "आज"],
  "7 days": ["7 dias", "7 días", "7 giorni", "7 Tage", "7 jours", "7 天", "7日間", "7 दिन"],
  "30 days": ["30 dias", "30 días", "30 giorni", "30 Tage", "30 jours", "30 天", "30日間", "30 दिन"],
  "All time": ["Tudo", "Todo", "Sempre", "Gesamt", "Tout", "全部", "全期間", "सारा समय"],
  "Project (optional)": ["Projeto (opcional)", "Proyecto (opcional)", "Progetto (facoltativo)", "Projekt (optional)", "Projet (facultatif)", "项目（可选）", "プロジェクト（任意）", "प्रोजेक्ट (वैकल्पिक)"],
  "All": ["Todos", "Todos", "Tutti", "Alle", "Tous", "全部", "すべて", "सभी"],
  "Team": ["Equipe", "Equipo", "Team", "Team", "Équipe", "团队", "チーム", "टीम"],
  "Who is working now, on which project and on what.": ["Quem está trabalhando agora, em qual projeto e no quê.", "Quién trabaja ahora, en qué proyecto y en qué.", "Chi sta lavorando ora, su quale progetto e su cosa.", "Wer gerade arbeitet, an welchem Projekt und woran.", "Qui travaille maintenant, sur quel projet et sur quoi.", "谁正在工作、在哪个项目、做什么。", "今だれが、どのプロジェクトで、何をしているか。", "अभी कौन, किस प्रोजेक्ट पर, क्या काम कर रहा है।"],
  "Skills and tools per employee": ["Skills e ferramentas por funcionário", "Skills y herramientas por empleado", "Skill e strumenti per dipendente", "Skills und Werkzeuge pro Person", "Skills et outils par employé", "每位员工的技能和工具", "メンバー別のスキルとツール", "हर कर्मचारी के स्किल्स और टूल"],
  "What each one used most in the period.": ["O que cada um mais usou no período.", "Lo que cada uno más usó en el periodo.", "Cosa ha usato di più ciascuno nel periodo.", "Was jede Person im Zeitraum am meisten genutzt hat.", "Ce que chacun a le plus utilisé sur la période.", "每人在此期间最常用的内容。", "期間中に各自が最も使ったもの。", "इस अवधि में हर किसी ने सबसे ज़्यादा क्या इस्तेमाल किया।"],
  "Total in the period and across how many agents.": ["Total no período e em quantos agentes.", "Total en el periodo y en cuántos agentes.", "Totale nel periodo e su quanti agenti.", "Gesamt im Zeitraum und bei wie vielen Agenten.", "Total sur la période et sur combien d'agents.", "期间总数及涉及的代理数。", "期間の合計と使ったエージェント数。", "अवधि में कुल और कितने एजेंटों में।"],
  "Read, Edit, Bash, MCPs and the like.": ["Read, Edit, Bash, MCPs e afins.", "Read, Edit, Bash, MCPs y similares.", "Read, Edit, Bash, MCP e simili.", "Read, Edit, Bash, MCPs und Ähnliches.", "Read, Edit, Bash, MCP et autres.", "Read、Edit、Bash、MCP 等。", "Read、Edit、Bash、MCP など。", "Read, Edit, Bash, MCP आदि।"],
  "Skill usage per day": ["Uso de skills por dia", "Uso de skills por día", "Uso delle skill al giorno", "Skill-Nutzung pro Tag", "Utilisation des skills par jour", "每日技能使用", "日別のスキル使用", "प्रति दिन स्किल उपयोग"],
  "Skill uses per day": ["Usos de skill por dia", "Usos de skills por día", "Usi delle skill al giorno", "Skill-Nutzungen pro Tag", "Utilisations de skills par jour", "每日技能使用次数", "日別のスキル使用回数", "प्रति दिन स्किल उपयोग"],
  "{n} employee(s)": ["{n} funcionário(s)", "{n} empleado(s)", "{n} dipendente/i", "{n} Person(en)", "{n} employé(s)", "{n} 名员工", "{n} 人", "{n} कर्मचारी"],
  "No skill used in the period.": ["Nenhuma skill usada no período.", "Ninguna skill usada en el periodo.", "Nessuna skill usata nel periodo.", "Keine Skill im Zeitraum genutzt.", "Aucun skill utilisé sur la période.", "此期间未使用技能。", "期間中に使われたスキルはありません。", "इस अवधि में कोई स्किल इस्तेमाल नहीं हुई।"],
  "No tool used in the period.": ["Nenhuma ferramenta usada no período.", "Ninguna herramienta usada en el periodo.", "Nessuno strumento usato nel periodo.", "Kein Werkzeug im Zeitraum genutzt.", "Aucun outil utilisé sur la période.", "此期间未使用工具。", "期間中に使われたツールはありません。", "इस अवधि में कोई टूल इस्तेमाल नहीं हुआ।"],
  "today": ["hoje", "hoy", "oggi", "heute", "aujourd'hui", "今天", "今日", "आज"],
  "in 7 days": ["em 7 dias", "en 7 días", "in 7 giorni", "in 7 Tagen", "sur 7 jours", "7 天内", "7日間", "7 दिनों में"],
  "in 30 days": ["em 30 dias", "en 30 días", "in 30 giorni", "in 30 Tagen", "sur 30 jours", "30 天内", "30日間", "30 दिनों में"],
  "in total": ["no total", "en total", "in totale", "insgesamt", "au total", "总计", "合計", "कुल"],
  "Employees working": ["Funcionários trabalhando", "Empleados trabajando", "Dipendenti al lavoro", "Mitarbeitende aktiv", "Employés au travail", "工作中的员工", "作業中のメンバー", "काम कर रहे कर्मचारी"],
  "Active projects now": ["Projetos ativos agora", "Proyectos activos ahora", "Progetti attivi ora", "Aktive Projekte jetzt", "Projets actifs maintenant", "当前活跃项目", "現在進行中のプロジェクト", "अभी सक्रिय प्रोजेक्ट"],
  "Delegated tasks {per}": ["Tarefas delegadas {per}", "Tareas delegadas {per}", "Attività delegate {per}", "Delegierte Aufgaben {per}", "Tâches déléguées {per}", "已分派任务（{per}）", "委任したタスク（{per}）", "सौंपे गए काम ({per})"],
  "Skill uses {per}": ["Usos de skill {per}", "Usos de skills {per}", "Usi delle skill {per}", "Skill-Nutzungen {per}", "Utilisations de skills {per}", "技能使用（{per}）", "スキル使用（{per}）", "स्किल उपयोग ({per})"],
  "Employee": ["Funcionário", "Empleado", "Dipendente", "Person", "Employé", "员工", "メンバー", "कर्मचारी"],
  "Last activity": ["Última atividade", "Última actividad", "Ultima attività", "Letzte Aktivität", "Dernière activité", "最近活动", "最終アクティビティ", "पिछली गतिविधि"],
  "{t} ago": ["há {t}", "hace {t}", "{t} fa", "vor {t}", "il y a {t}", "{t} 前", "{t}前", "{t} पहले"],
  "never": ["nunca", "nunca", "mai", "nie", "jamais", "从未", "なし", "कभी नहीं"],
  "{n} tasks": ["{n} tarefas", "{n} tareas", "{n} attività", "{n} Aufgaben", "{n} tâches", "{n} 个任务", "{n} 件のタスク", "{n} काम"],
  "Tools": ["Ferramentas", "Herramientas", "Strumenti", "Werkzeuge", "Outils", "工具", "ツール", "टूल"],
  "none in the period": ["nenhuma no período", "ninguna en el periodo", "nessuna nel periodo", "keine im Zeitraum", "aucun sur la période", "此期间无", "期間中なし", "इस अवधि में कोई नहीं"],
  "{n} skill uses in the period.": ["{n} usos de skill no período.", "{n} usos de skills en el periodo.", "{n} usi delle skill nel periodo.", "{n} Skill-Nutzungen im Zeitraum.", "{n} utilisations de skills sur la période.", "此期间共使用技能 {n} 次。", "期間中のスキル使用は {n} 回。", "इस अवधि में {n} बार स्किल उपयोग।"],
  "No usage in the period.": ["Nenhum uso no período.", "Ningún uso en el periodo.", "Nessun uso nel periodo.", "Keine Nutzung im Zeitraum.", "Aucune utilisation sur la période.", "此期间无使用。", "期間中の使用はありません。", "इस अवधि में कोई उपयोग नहीं।"],

  // skills
  "Search a skill by name or what it does": ["Buscar skill pelo nome ou pelo que ela faz", "Buscar una skill por nombre o por lo que hace", "Cerca una skill per nome o per cosa fa", "Skill nach Name oder Funktion suchen", "Chercher un skill par nom ou par fonction", "按名称或功能搜索技能", "名前や機能でスキルを検索", "नाम या काम से स्किल खोजें"],
  "Source": ["Origem", "Origen", "Origine", "Quelle", "Origine", "来源", "提供元", "स्रोत"],
  "only the ones I used": ["só as que já usei", "solo las que he usado", "solo quelle già usate", "nur bereits genutzte", "seulement ceux déjà utilisés", "只看用过的", "使ったものだけ", "सिर्फ़ जो इस्तेमाल किए"],
  "Installed skills": ["Skills instaladas", "Skills instaladas", "Skill installate", "Installierte Skills", "Skills installés", "已安装技能", "インストール済みスキル", "इंस्टॉल स्किल्स"],
  "Click a skill to see what it does.": ["Clique numa skill para ver o que ela faz.", "Haz clic en una skill para ver qué hace.", "Clicca una skill per vedere cosa fa.", "Klicke auf eine Skill, um zu sehen, was sie tut.", "Cliquez sur un skill pour voir ce qu'il fait.", "点击技能查看其功能。", "スキルをクリックすると内容が見られます。", "स्किल पर क्लिक करके देखें वह क्या करती है।"],
  "the server answered {s}": ["o servidor respondeu {s}", "el servidor respondió {s}", "il server ha risposto {s}", "der Server antwortete {s}", "le serveur a répondu {s}", "服务器返回 {s}", "サーバーの応答 {s}", "सर्वर ने {s} जवाब दिया"],
  "Could not fetch the skills ({e}).": ["Não consegui buscar as skills ({e}).", "No pude obtener las skills ({e}).", "Impossibile caricare le skill ({e}).", "Skills konnten nicht geladen werden ({e}).", "Impossible de récupérer les skills ({e}).", "无法获取技能（{e}）。", "スキルを取得できませんでした（{e}）。", "स्किल्स नहीं मिल सकीं ({e})।"],
  "If you just updated the files, stop the server (Ctrl+C) and run <code>bun run start</code> again.": ["Se você acabou de atualizar os arquivos, pare o servidor (Ctrl+C) e rode <code>bun run start</code> de novo.", "Si acabas de actualizar los archivos, detén el servidor (Ctrl+C) y ejecuta <code>bun run start</code> otra vez.", "Se hai appena aggiornato i file, ferma il server (Ctrl+C) ed esegui di nuovo <code>bun run start</code>.", "Wenn du gerade Dateien aktualisiert hast, stoppe den Server (Strg+C) und starte <code>bun run start</code> neu.", "Si vous venez de mettre à jour les fichiers, arrêtez le serveur (Ctrl+C) et relancez <code>bun run start</code>.", "如果刚更新了文件，请停止服务器（Ctrl+C）并重新运行 <code>bun run start</code>。", "ファイルを更新した直後なら、サーバーを停止（Ctrl+C）して <code>bun run start</code> を再実行してください。", "अगर आपने अभी फ़ाइलें अपडेट की हैं, तो सर्वर रोकें (Ctrl+C) और फिर से <code>bun run start</code> चलाएँ।"],
  "Personal commands": ["Comandos pessoais", "Comandos personales", "Comandi personali", "Eigene Befehle", "Commandes personnelles", "个人命令", "個人コマンド", "निजी कमांड"],
  "Plugins with skills": ["Plugins com skills", "Plugins con skills", "Plugin con skill", "Plugins mit Skills", "Plugins avec skills", "含技能的插件", "スキル付きプラグイン", "स्किल वाले प्लगइन"],
  "Already used": ["Já usadas", "Ya usadas", "Già usate", "Schon genutzt", "Déjà utilisés", "已使用", "使用済み", "इस्तेमाल हो चुकी"],
  "No skill found.": ["Nenhuma skill encontrada.", "No se encontró ninguna skill.", "Nessuna skill trovata.", "Keine Skill gefunden.", "Aucun skill trouvé.", "未找到技能。", "スキルが見つかりません。", "कोई स्किल नहीं मिली।"],
  "No skill found on this computer.": ["Nenhuma skill encontrada neste computador.", "No se encontró ninguna skill en este equipo.", "Nessuna skill trovata su questo computer.", "Auf diesem Computer wurde keine Skill gefunden.", "Aucun skill trouvé sur cet ordinateur.", "此电脑上未找到技能。", "このコンピューターにスキルがありません。", "इस कंप्यूटर पर कोई स्किल नहीं मिली।"],
  "Folders checked:": ["Pastas verificadas:", "Carpetas revisadas:", "Cartelle controllate:", "Geprüfte Ordner:", "Dossiers vérifiés :", "已检查的文件夹：", "確認したフォルダー：", "जाँचे गए फ़ोल्डर:"],
  "{n} file(s)": ["{n} arquivo(s)", "{n} archivo(s)", "{n} file", "{n} Datei(en)", "{n} fichier(s)", "{n} 个文件", "{n} ファイル", "{n} फ़ाइल"],
  "does not exist": ["não existe", "no existe", "non esiste", "existiert nicht", "n'existe pas", "不存在", "存在しません", "मौजूद नहीं"],
  "disabled": ["desativada", "desactivada", "disattivata", "deaktiviert", "désactivé", "已停用", "無効", "बंद"],
  "Type <code>/{n}</code> in Claude Code.": ["Digite <code>/{n}</code> no Claude Code.", "Escribe <code>/{n}</code> en Claude Code.", "Digita <code>/{n}</code> in Claude Code.", "Gib <code>/{n}</code> in Claude Code ein.", "Tapez <code>/{n}</code> dans Claude Code.", "在 Claude Code 中输入 <code>/{n}</code>。", "Claude Code で <code>/{n}</code> と入力します。", "Claude Code में <code>/{n}</code> टाइप करें।"],
  "Claude uses it on its own when the request matches the description. You can also ask: <code>use the skill {s}</code>.": ["O Claude usa sozinho quando o pedido combina com a descrição. Você também pode pedir: <code>use a skill {s}</code>.", "Claude la usa solo cuando el pedido coincide con la descripción. También puedes pedir: <code>usa la skill {s}</code>.", "Claude la usa da solo quando la richiesta corrisponde alla descrizione. Puoi anche chiedere: <code>usa la skill {s}</code>.", "Claude nutzt sie selbst, wenn die Anfrage zur Beschreibung passt. Du kannst auch sagen: <code>nutze die Skill {s}</code>.", "Claude l'utilise seul quand la demande correspond à la description. Vous pouvez aussi demander : <code>utilise le skill {s}</code>.", "当请求与描述相符时，Claude 会自动使用。你也可以说：<code>使用技能 {s}</code>。", "依頼が説明に合うと Claude が自動で使います。<code>スキル {s} を使って</code> と頼むこともできます。", "जब अनुरोध विवरण से मेल खाता है, Claude इसे खुद इस्तेमाल करता है। आप यह भी कह सकते हैं: <code>स्किल {s} इस्तेमाल करो</code>।"],
  "Or type <code>/{n}</code>.": ["Ou digite <code>/{n}</code>.", "O escribe <code>/{n}</code>.", "Oppure digita <code>/{n}</code>.", "Oder gib <code>/{n}</code> ein.", "Ou tapez <code>/{n}</code>.", "或输入 <code>/{n}</code>。", "または <code>/{n}</code> と入力。", "या <code>/{n}</code> टाइप करें।"],
  "plugin disabled": ["plugin desativado", "plugin desactivado", "plugin disattivato", "Plugin deaktiviert", "plugin désactivé", "插件已停用", "プラグイン無効", "प्लगइन बंद"],
  "Full name": ["Nome completo", "Nombre completo", "Nome completo", "Vollständiger Name", "Nom complet", "全名", "正式名", "पूरा नाम"],
  "Uses": ["Usos", "Usos", "Utilizzi", "Nutzungen", "Utilisations", "使用次数", "使用回数", "उपयोग"],
  "{n} time(s), the last {t} ago": ["{n} vez(es), a última há {t}", "{n} vez/veces, la última hace {t}", "{n} volta/e, l'ultima {t} fa", "{n}-mal, zuletzt vor {t}", "{n} fois, la dernière il y a {t}", "{n} 次，最近一次在 {t} 前", "{n} 回、最後は {t}前", "{n} बार, आख़िरी {t} पहले"],
  "never used": ["nunca usada", "nunca usada", "mai usata", "nie genutzt", "jamais utilisé", "从未使用", "未使用", "कभी इस्तेमाल नहीं"],
  "How to use": ["Como usar", "Cómo usar", "Come usarla", "Verwendung", "Utilisation", "使用方法", "使い方", "कैसे इस्तेमाल करें"],
  "What it does": ["O que ela faz", "Qué hace", "Cosa fa", "Was sie tut", "Ce qu'il fait", "功能", "できること", "यह क्या करती है"],
  "No description.": ["Sem descrição.", "Sin descripción.", "Nessuna descrizione.", "Keine Beschreibung.", "Pas de description.", "无描述。", "説明なし。", "कोई विवरण नहीं।"],
  "Support files": ["Arquivos de apoio", "Archivos de apoyo", "File di supporto", "Begleitdateien", "Fichiers annexes", "辅助文件", "補助ファイル", "सहायक फ़ाइलें"],
  "See the full instructions": ["Ver as instruções completas", "Ver las instrucciones completas", "Vedi le istruzioni complete", "Vollständige Anleitung anzeigen", "Voir les instructions complètes", "查看完整说明", "全文を表示", "पूरे निर्देश देखें"],
  "{n} of {total}": ["{n} de {total}", "{n} de {total}", "{n} di {total}", "{n} von {total}", "{n} sur {total}", "{n} / {total}", "{n} / {total}", "{total} में से {n}"],
  "Personal": ["Pessoal", "Personal", "Personale", "Persönlich", "Personnel", "个人", "個人", "निजी"],
  "Personal command": ["Comando pessoal", "Comando personal", "Comando personale", "Eigener Befehl", "Commande personnelle", "个人命令", "個人コマンド", "निजी कमांड"],
  "Plugin {x}": ["Plugin {x}", "Plugin {x}", "Plugin {x}", "Plugin {x}", "Plugin {x}", "插件 {x}", "プラグイン {x}", "प्लगइन {x}"],
  "Project {x}": ["Projeto {x}", "Proyecto {x}", "Progetto {x}", "Projekt {x}", "Projet {x}", "项目 {x}", "プロジェクト {x}", "प्रोजेक्ट {x}"],

  // graphify
  "Checking Graphify...": ["Verificando o Graphify...", "Comprobando Graphify...", "Verifica di Graphify...", "Graphify wird geprüft...", "Vérification de Graphify...", "正在检查 Graphify...", "Graphify を確認中...", "Graphify जाँच रहे हैं..."],
  "Projects": ["Projetos", "Proyectos", "Progetti", "Projekte", "Projets", "项目", "プロジェクト", "प्रोजेक्ट"],
  "Folders where Claude Code has worked, plus the ones you add.": ["Pastas onde o Claude Code já trabalhou, mais as que você adicionar.", "Carpetas donde Claude Code ya trabajó, más las que añadas.", "Cartelle dove Claude Code ha già lavorato, più quelle che aggiungi.", "Ordner, in denen Claude Code schon gearbeitet hat, plus deine eigenen.", "Dossiers où Claude Code a déjà travaillé, plus ceux que vous ajoutez.", "Claude Code 处理过的文件夹，以及你添加的。", "Claude Code が作業したフォルダーと、追加したもの。", "जिन फ़ोल्डरों में Claude Code काम कर चुका है, और जो आप जोड़ें।"],
  "Add a folder, e.g. C:\\Projects\\my-app or ~/projects/my-app": ["Adicionar pasta, ex.: C:\\Projetos\\meu-app ou ~/projetos/meu-app", "Añadir carpeta, p. ej. C:\\Proyectos\\mi-app o ~/proyectos/mi-app", "Aggiungi cartella, es. C:\\Progetti\\mia-app o ~/progetti/mia-app", "Ordner hinzufügen, z. B. C:\\Projekte\\meine-app oder ~/projekte/meine-app", "Ajouter un dossier, ex. C:\\Projets\\mon-app ou ~/projets/mon-app", "添加文件夹，例如 C:\\Projects\\my-app 或 ~/projects/my-app", "フォルダーを追加（例：C:\\Projects\\my-app、~/projects/my-app）", "फ़ोल्डर जोड़ें, जैसे C:\\Projects\\my-app या ~/projects/my-app"],
  "Add": ["Adicionar", "Añadir", "Aggiungi", "Hinzufügen", "Ajouter", "添加", "追加", "जोड़ें"],
  "Pick a project to see the graph.": ["Escolha um projeto para ver o grafo.", "Elige un proyecto para ver el grafo.", "Scegli un progetto per vedere il grafo.", "Wähle ein Projekt, um den Graphen zu sehen.", "Choisissez un projet pour voir le graphe.", "选择项目以查看图谱。", "プロジェクトを選ぶとグラフが表示されます。", "ग्राफ़ देखने के लिए प्रोजेक्ट चुनें।"],
  "Could not reach the Office server. If you just updated the files, run <code>bun run office:parar</code> and <code>bun run office:ligar</code>.": ["Não consegui falar com o servidor do Office. Se você acabou de atualizar os arquivos, rode <code>bun run office:parar</code> e <code>bun run office:ligar</code>.", "No pude contactar el servidor del Office. Si acabas de actualizar los archivos, ejecuta <code>bun run office:parar</code> y <code>bun run office:ligar</code>.", "Impossibile contattare il server dell'Office. Se hai appena aggiornato i file, esegui <code>bun run office:parar</code> e <code>bun run office:ligar</code>.", "Office-Server nicht erreichbar. Wenn du gerade Dateien aktualisiert hast, führe <code>bun run office:parar</code> und <code>bun run office:ligar</code> aus.", "Impossible de joindre le serveur de l'Office. Si vous venez de mettre à jour les fichiers, lancez <code>bun run office:parar</code> puis <code>bun run office:ligar</code>.", "无法连接 Office 服务器。如果刚更新了文件，请运行 <code>bun run office:parar</code> 和 <code>bun run office:ligar</code>。", "Office サーバーに接続できません。ファイルを更新した直後なら <code>bun run office:parar</code> と <code>bun run office:ligar</code> を実行してください。", "Office सर्वर से संपर्क नहीं हो सका। अगर आपने अभी फ़ाइलें अपडेट की हैं, तो <code>bun run office:parar</code> और <code>bun run office:ligar</code> चलाएँ।"],
  "<b class=\"ok\">Graphify {v}</b> installed.": ["<b class=\"ok\">Graphify {v}</b> instalado.", "<b class=\"ok\">Graphify {v}</b> instalado.", "<b class=\"ok\">Graphify {v}</b> installato.", "<b class=\"ok\">Graphify {v}</b> installiert.", "<b class=\"ok\">Graphify {v}</b> installé.", "<b class=\"ok\">Graphify {v}</b> 已安装。", "<b class=\"ok\">Graphify {v}</b> インストール済み。", "<b class=\"ok\">Graphify {v}</b> इंस्टॉल है।"],
  "/graphify active in Claude Code": ["/graphify ativo no Claude Code", "/graphify activo en Claude Code", "/graphify attivo in Claude Code", "/graphify in Claude Code aktiv", "/graphify actif dans Claude Code", "/graphify 已在 Claude Code 中启用", "/graphify は Claude Code で有効", "/graphify Claude Code में चालू"],
  "Runs graphify install: copies the skill to ~/.claude/skills/graphify and adds a section to your CLAUDE.md": ["Roda graphify install: copia a skill para ~/.claude/skills/graphify e adiciona uma seção no seu CLAUDE.md", "Ejecuta graphify install: copia la skill a ~/.claude/skills/graphify y añade una sección a tu CLAUDE.md", "Esegue graphify install: copia la skill in ~/.claude/skills/graphify e aggiunge una sezione al tuo CLAUDE.md", "Führt graphify install aus: kopiert die Skill nach ~/.claude/skills/graphify und ergänzt deine CLAUDE.md", "Lance graphify install : copie le skill dans ~/.claude/skills/graphify et ajoute une section à votre CLAUDE.md", "运行 graphify install：把技能复制到 ~/.claude/skills/graphify，并在你的 CLAUDE.md 中添加一节", "graphify install を実行：スキルを ~/.claude/skills/graphify にコピーし、CLAUDE.md に節を追加", "graphify install चलाता है: स्किल को ~/.claude/skills/graphify में कॉपी करता है और आपकी CLAUDE.md में एक सेक्शन जोड़ता है"],
  "Enable /graphify in Claude Code": ["Ativar /graphify no Claude Code", "Activar /graphify en Claude Code", "Attiva /graphify in Claude Code", "/graphify in Claude Code aktivieren", "Activer /graphify dans Claude Code", "在 Claude Code 中启用 /graphify", "Claude Code で /graphify を有効化", "Claude Code में /graphify चालू करें"],
  "Update Graphify": ["Atualizar Graphify", "Actualizar Graphify", "Aggiorna Graphify", "Graphify aktualisieren", "Mettre à jour Graphify", "更新 Graphify", "Graphify を更新", "Graphify अपडेट करें"],
  "Graphify is not installed yet.": ["O Graphify ainda não está instalado.", "Graphify aún no está instalado.", "Graphify non è ancora installato.", "Graphify ist noch nicht installiert.", "Graphify n'est pas encore installé.", "尚未安装 Graphify。", "Graphify はまだインストールされていません。", "Graphify अभी इंस्टॉल नहीं है।"],
  "I will install the official <code>graphifyy</code> package with {x}.": ["Vou instalar o pacote oficial <code>graphifyy</code> com {x}.", "Instalaré el paquete oficial <code>graphifyy</code> con {x}.", "Installerò il pacchetto ufficiale <code>graphifyy</code> con {x}.", "Ich installiere das offizielle Paket <code>graphifyy</code> mit {x}.", "J'installerai le paquet officiel <code>graphifyy</code> avec {x}.", "将用 {x} 安装官方包 <code>graphifyy</code>。", "公式パッケージ <code>graphifyy</code> を {x} でインストールします。", "मैं {x} से आधिकारिक पैकेज <code>graphifyy</code> इंस्टॉल करूँगा।"],
  "Installing...": ["Instalando...", "Instalando...", "Installazione...", "Wird installiert...", "Installation...", "正在安装...", "インストール中...", "इंस्टॉल हो रहा है..."],
  "Install Graphify": ["Instalar Graphify", "Instalar Graphify", "Installa Graphify", "Graphify installieren", "Installer Graphify", "安装 Graphify", "Graphify をインストール", "Graphify इंस्टॉल करें"],
  "<b class=\"warn\">Graphify needs Python.</b> Install <b>uv</b> (it brings Python along) in PowerShell, then reload this page:": ["<b class=\"warn\">O Graphify precisa de Python.</b> Instale o <b>uv</b> (ele traz o Python junto) no PowerShell e depois recarregue esta página:", "<b class=\"warn\">Graphify necesita Python.</b> Instala <b>uv</b> (trae Python) en PowerShell y recarga esta página:", "<b class=\"warn\">Graphify richiede Python.</b> Installa <b>uv</b> (include Python) in PowerShell, poi ricarica la pagina:", "<b class=\"warn\">Graphify braucht Python.</b> Installiere <b>uv</b> (bringt Python mit) in PowerShell und lade die Seite neu:", "<b class=\"warn\">Graphify a besoin de Python.</b> Installez <b>uv</b> (il apporte Python) dans PowerShell, puis rechargez la page :", "<b class=\"warn\">Graphify 需要 Python。</b>在 PowerShell 中安装 <b>uv</b>（自带 Python），然后刷新此页：", "<b class=\"warn\">Graphify には Python が必要です。</b>PowerShell で <b>uv</b>（Python 同梱）をインストールし、このページを再読み込みしてください：", "<b class=\"warn\">Graphify को Python चाहिए।</b> PowerShell में <b>uv</b> इंस्टॉल करें (इसके साथ Python आता है), फिर यह पेज रीलोड करें:"],
  "After installing, restart the Office server (<code>bun run office:parar</code> and <code>bun run office:ligar</code>).": ["Depois de instalar, feche e abra o servidor do Office (<code>bun run office:parar</code> e <code>bun run office:ligar</code>).", "Después de instalar, reinicia el servidor del Office (<code>bun run office:parar</code> y <code>bun run office:ligar</code>).", "Dopo l'installazione, riavvia il server dell'Office (<code>bun run office:parar</code> e <code>bun run office:ligar</code>).", "Starte danach den Office-Server neu (<code>bun run office:parar</code> und <code>bun run office:ligar</code>).", "Après l'installation, redémarrez le serveur de l'Office (<code>bun run office:parar</code> puis <code>bun run office:ligar</code>).", "安装后请重启 Office 服务器（<code>bun run office:parar</code> 和 <code>bun run office:ligar</code>）。", "インストール後、Office サーバーを再起動してください（<code>bun run office:parar</code> と <code>bun run office:ligar</code>）。", "इंस्टॉल के बाद Office सर्वर फिर से चालू करें (<code>bun run office:parar</code> और <code>bun run office:ligar</code>)।"],
  "/graphify activation": ["Ativação do /graphify", "Activación de /graphify", "Attivazione di /graphify", "Aktivierung von /graphify", "Activation de /graphify", "/graphify 启用", "/graphify の有効化", "/graphify चालू करना"],
  "Installation": ["Instalação", "Instalación", "Installazione", "Installation", "Installation", "安装", "インストール", "इंस्टॉलेशन"],
  "running...": ["rodando...", "en curso...", "in corso...", "läuft...", "en cours...", "运行中...", "実行中...", "चल रहा है..."],
  "finished": ["concluída", "terminada", "completata", "fertig", "terminée", "已完成", "完了", "पूरा"],
  "failed": ["falhou", "falló", "non riuscita", "fehlgeschlagen", "échouée", "失败", "失敗", "विफल"],
  "Hidden projects ({n})": ["Projetos ocultos ({n})", "Proyectos ocultos ({n})", "Progetti nascosti ({n})", "Ausgeblendete Projekte ({n})", "Projets masqués ({n})", "已隐藏项目（{n}）", "非表示のプロジェクト（{n}）", "छिपे प्रोजेक्ट ({n})"],
  "Show": ["Mostrar", "Mostrar", "Mostra", "Anzeigen", "Afficher", "显示", "表示", "दिखाएँ"],
  "No project in the list. Add a folder above.": ["Nenhum projeto na lista. Adicione uma pasta acima.", "Ningún proyecto en la lista. Añade una carpeta arriba.", "Nessun progetto in elenco. Aggiungi una cartella qui sopra.", "Kein Projekt in der Liste. Füge oben einen Ordner hinzu.", "Aucun projet dans la liste. Ajoutez un dossier ci-dessus.", "列表中没有项目。请在上方添加文件夹。", "リストにプロジェクトがありません。上でフォルダーを追加してください。", "सूची में कोई प्रोजेक्ट नहीं। ऊपर फ़ोल्डर जोड़ें।"],
  "building...": ["gerando...", "generando...", "generazione...", "wird erstellt...", "génération...", "生成中...", "生成中...", "बन रहा है..."],
  "{n} nodes": ["{n} nós", "{n} nodos", "{n} nodi", "{n} Knoten", "{n} nœuds", "{n} 个节点", "{n} ノード", "{n} नोड"],
  "no graph": ["sem grafo", "sin grafo", "nessun grafo", "kein Graph", "pas de graphe", "无图谱", "グラフなし", "कोई ग्राफ़ नहीं"],
  "updated {t} ago": ["atualizado há {t}", "actualizado hace {t}", "aggiornato {t} fa", "vor {t} aktualisiert", "mis à jour il y a {t}", "{t} 前更新", "{t}前に更新", "{t} पहले अपडेट"],
  "Hide this project from the list (deletes nothing)": ["Ocultar este projeto da lista (não apaga nada)", "Ocultar este proyecto de la lista (no borra nada)", "Nascondi questo progetto dall'elenco (non cancella nulla)", "Projekt aus der Liste ausblenden (löscht nichts)", "Masquer ce projet de la liste (ne supprime rien)", "从列表中隐藏此项目（不删除任何内容）", "このプロジェクトをリストから隠す（何も削除しません）", "इस प्रोजेक्ट को सूची से छिपाएँ (कुछ नहीं मिटता)"],
  "Hide {x}": ["Ocultar {x}", "Ocultar {x}", "Nascondi {x}", "{x} ausblenden", "Masquer {x}", "隐藏 {x}", "{x} を隠す", "{x} छिपाएँ"],
  "hide": ["ocultar", "ocultar", "nascondi", "ausblenden", "masquer", "隐藏", "隠す", "छिपाएँ"],
  "Building...": ["Gerando...", "Generando...", "Generazione...", "Wird erstellt...", "Génération...", "生成中...", "生成中...", "बन रहा है..."],
  "Update graph": ["Atualizar grafo", "Actualizar grafo", "Aggiorna grafo", "Graph aktualisieren", "Mettre à jour le graphe", "更新图谱", "グラフを更新", "ग्राफ़ अपडेट करें"],
  "Build graph": ["Gerar grafo", "Generar grafo", "Genera grafo", "Graph erstellen", "Générer le graphe", "生成图谱", "グラフを生成", "ग्राफ़ बनाएँ"],
  "Open full screen": ["Abrir em tela cheia", "Abrir a pantalla completa", "Apri a schermo intero", "Im Vollbild öffnen", "Ouvrir en plein écran", "全屏打开", "全画面で開く", "पूरी स्क्रीन में खोलें"],
  "Removes it from the list (deletes nothing). To bring it back: Hidden projects, below the list": ["Tira da lista (não apaga nada). Para voltar: Projetos ocultos, embaixo da lista", "Lo quita de la lista (no borra nada). Para recuperarlo: Proyectos ocultos, debajo de la lista", "Lo toglie dall'elenco (non cancella nulla). Per riaverlo: Progetti nascosti, sotto l'elenco", "Entfernt es aus der Liste (löscht nichts). Zurückholen: Ausgeblendete Projekte, unter der Liste", "Le retire de la liste (ne supprime rien). Pour le récupérer : Projets masqués, sous la liste", "从列表移除（不删除任何内容）。恢复：列表下方的“已隐藏项目”", "リストから外します（何も削除しません）。戻すには：リスト下の「非表示のプロジェクト」", "सूची से हटाता है (कुछ नहीं मिटता)। वापस लाने के लिए: सूची के नीचे छिपे प्रोजेक्ट"],
  "Hide project": ["Ocultar projeto", "Ocultar proyecto", "Nascondi progetto", "Projekt ausblenden", "Masquer le projet", "隐藏项目", "プロジェクトを隠す", "प्रोजेक्ट छिपाएँ"],
  "nodes": ["nós", "nodos", "nodi", "Knoten", "nœuds", "节点", "ノード", "नोड"],
  "links": ["ligações", "enlaces", "collegamenti", "Verbindungen", "liens", "连接", "リンク", "लिंक"],
  "groups": ["grupos", "grupos", "gruppi", "Gruppen", "groupes", "分组", "グループ", "समूह"],
  "built {t} ago": ["gerado há {t}", "generado hace {t}", "generato {t} fa", "vor {t} erstellt", "généré il y a {t}", "{t} 前生成", "{t}前に生成", "{t} पहले बना"],
  "Last build": ["Última geração", "Última generación", "Ultima generazione", "Letzte Erstellung", "Dernière génération", "最近一次生成", "最後の生成", "पिछला बिल्ड"],
  "This project has no graph yet. Click <b>Build graph</b>: Graphify reads the folder's code and creates <code>graphify-out/</code> inside it. It takes a few seconds and uses no AI.": ["Este projeto ainda não tem grafo. Clique em <b>Gerar grafo</b>: o Graphify lê o código da pasta e cria <code>graphify-out/</code> dentro dela. Leva poucos segundos e não usa IA.", "Este proyecto aún no tiene grafo. Haz clic en <b>Generar grafo</b>: Graphify lee el código de la carpeta y crea <code>graphify-out/</code> dentro. Tarda unos segundos y no usa IA.", "Questo progetto non ha ancora un grafo. Clicca <b>Genera grafo</b>: Graphify legge il codice della cartella e crea <code>graphify-out/</code> al suo interno. Bastano pochi secondi e non usa IA.", "Dieses Projekt hat noch keinen Graphen. Klicke auf <b>Graph erstellen</b>: Graphify liest den Code im Ordner und legt darin <code>graphify-out/</code> an. Dauert Sekunden und nutzt keine KI.", "Ce projet n'a pas encore de graphe. Cliquez sur <b>Générer le graphe</b> : Graphify lit le code du dossier et crée <code>graphify-out/</code> à l'intérieur. Quelques secondes, sans IA.", "该项目还没有图谱。点击<b>生成图谱</b>：Graphify 会读取文件夹中的代码并在其中创建 <code>graphify-out/</code>。只需几秒，不使用 AI。", "このプロジェクトにはまだグラフがありません。<b>グラフを生成</b>をクリックすると、Graphify がフォルダーのコードを読み込み <code>graphify-out/</code> を作成します。数秒で終わり、AI は使いません。", "इस प्रोजेक्ट का अभी ग्राफ़ नहीं है। <b>ग्राफ़ बनाएँ</b> पर क्लिक करें: Graphify फ़ोल्डर का कोड पढ़कर उसमें <code>graphify-out/</code> बनाता है। कुछ सेकंड लगते हैं और AI इस्तेमाल नहीं होता।"],
  "Graph": ["Grafo", "Grafo", "Grafo", "Graph", "Graphe", "图谱", "グラフ", "ग्राफ़"],
  "Report": ["Relatório", "Informe", "Report", "Bericht", "Rapport", "报告", "レポート", "रिपोर्ट"],
  "Ask": ["Perguntar", "Preguntar", "Chiedi", "Fragen", "Demander", "提问", "質問", "पूछें"],
  "Graph of {x}": ["Grafo de {x}", "Grafo de {x}", "Grafo di {x}", "Graph von {x}", "Graphe de {x}", "{x} 的图谱", "{x} のグラフ", "{x} का ग्राफ़"],
  "Free question": ["Pergunta livre", "Pregunta libre", "Domanda libera", "Freie Frage", "Question libre", "自由提问", "自由な質問", "खुला सवाल"],
  "Answers with the part of the graph related to the question.": ["Responde com a parte do grafo ligada à pergunta.", "Responde con la parte del grafo relacionada con la pregunta.", "Risponde con la parte del grafo legata alla domanda.", "Antwortet mit dem Teil des Graphen, der zur Frage passt.", "Répond avec la partie du graphe liée à la question.", "用与问题相关的图谱部分回答。", "質問に関係するグラフの部分で答えます。", "सवाल से जुड़े ग्राफ़ के हिस्से से जवाब देता है।"],
  "Question (e.g. how does login work?)": ["Pergunta (ex.: como o login funciona?)", "Pregunta (p. ej. ¿cómo funciona el login?)", "Domanda (es. come funziona il login?)", "Frage (z. B. wie funktioniert der Login?)", "Question (ex. comment marche la connexion ?)", "问题（例如：登录是如何工作的？）", "質問（例：ログインの仕組みは？）", "सवाल (जैसे लॉगिन कैसे काम करता है?)"],
  "Explain an item": ["Explicar um item", "Explicar un elemento", "Spiega un elemento", "Element erklären", "Expliquer un élément", "解释某项", "項目を説明", "किसी आइटम को समझाएँ"],
  "Shows where it comes from and what it connects to.": ["Mostra de onde vem e com o que se liga.", "Muestra de dónde viene y con qué se conecta.", "Mostra da dove viene e a cosa si collega.", "Zeigt, woher es kommt und womit es verbunden ist.", "Montre d'où il vient et à quoi il se relie.", "显示它的来源和关联。", "どこから来て何とつながるかを示します。", "दिखाता है यह कहाँ से आता है और किससे जुड़ा है।"],
  "Name (function, class, file...)": ["Nome (função, classe, arquivo...)", "Nombre (función, clase, archivo...)", "Nome (funzione, classe, file...)", "Name (Funktion, Klasse, Datei...)", "Nom (fonction, classe, fichier...)", "名称（函数、类、文件...）", "名前（関数、クラス、ファイル...）", "नाम (फ़ंक्शन, क्लास, फ़ाइल...)"],
  "Path between two items": ["Caminho entre dois itens", "Camino entre dos elementos", "Percorso tra due elementi", "Pfad zwischen zwei Elementen", "Chemin entre deux éléments", "两项之间的路径", "2つの項目間の経路", "दो आइटम के बीच का रास्ता"],
  "How one thing reaches the other.": ["Como uma coisa chega na outra.", "Cómo una cosa llega a la otra.", "Come una cosa arriva all'altra.", "Wie eins zum anderen führt.", "Comment une chose mène à l'autre.", "一项如何到达另一项。", "一方がもう一方へどうつながるか。", "एक चीज़ दूसरी तक कैसे पहुँचती है।"],
  "From": ["De", "Desde", "Da", "Von", "De", "从", "開始", "से"],
  "To": ["Até", "Hasta", "A", "Bis", "À", "到", "終了", "तक"],
  "What is affected": ["O que é afetado", "Qué se ve afectado", "Cosa viene influenzato", "Was betroffen ist", "Ce qui est affecté", "受影响的内容", "影響範囲", "क्या प्रभावित होता है"],
  "What may break if this item changes.": ["O que pode quebrar se este item mudar.", "Qué puede romperse si cambia este elemento.", "Cosa può rompersi se questo elemento cambia.", "Was kaputtgehen kann, wenn sich dieses Element ändert.", "Ce qui peut casser si cet élément change.", "此项变化时可能出问题的地方。", "この項目が変わると壊れうるもの。", "यह आइटम बदले तो क्या टूट सकता है।"],
  "Item name": ["Nome do item", "Nombre del elemento", "Nome dell'elemento", "Name des Elements", "Nom de l'élément", "项名称", "項目名", "आइटम का नाम"],
  "Central pieces": ["Peças centrais", "Piezas centrales", "Pezzi centrali", "Zentrale Teile", "Pièces centrales", "核心部分", "中心的な部品", "मुख्य हिस्से"],
  "The most connected items in the project.": ["Os itens mais conectados do projeto.", "Los elementos más conectados del proyecto.", "Gli elementi più collegati del progetto.", "Die am stärksten verbundenen Elemente des Projekts.", "Les éléments les plus connectés du projet.", "项目中连接最多的项。", "プロジェクトで最もつながりの多い項目。", "प्रोजेक्ट के सबसे ज़्यादा जुड़े आइटम।"],
  "Uses Graphify's own commands on <code>graph.json</code>.": ["Usa os comandos do próprio Graphify em cima do <code>graph.json</code>.", "Usa los comandos de Graphify sobre <code>graph.json</code>.", "Usa i comandi di Graphify su <code>graph.json</code>.", "Nutzt die Graphify-Befehle auf <code>graph.json</code>.", "Utilise les commandes de Graphify sur <code>graph.json</code>.", "在 <code>graph.json</code> 上使用 Graphify 自带命令。", "<code>graph.json</code> に Graphify のコマンドを使います。", "<code>graph.json</code> पर Graphify के अपने कमांड चलाता है।"],
  "Querying the graph...": ["Consultando o grafo...", "Consultando el grafo...", "Interrogazione del grafo...", "Graph wird abgefragt...", "Interrogation du graphe...", "正在查询图谱...", "グラフを照会中...", "ग्राफ़ से पूछ रहे हैं..."],
  "(no answer)": ["(sem resposta)", "(sin respuesta)", "(nessuna risposta)", "(keine Antwort)", "(pas de réponse)", "（无回答）", "（回答なし）", "(कोई जवाब नहीं)"],
  "Project hidden. To bring it back, open \"Hidden projects\" below the list.": ["Projeto ocultado. Para trazer de volta, abra \"Projetos ocultos\" embaixo da lista.", "Proyecto oculto. Para recuperarlo, abre \"Proyectos ocultos\" debajo de la lista.", "Progetto nascosto. Per riaverlo, apri \"Progetti nascosti\" sotto l'elenco.", "Projekt ausgeblendet. Zum Zurückholen öffne \"Ausgeblendete Projekte\" unter der Liste.", "Projet masqué. Pour le récupérer, ouvrez \"Projets masqués\" sous la liste.", "项目已隐藏。要恢复，请打开列表下方的“已隐藏项目”。", "プロジェクトを非表示にしました。戻すにはリスト下の「非表示のプロジェクト」を開いてください。", "प्रोजेक्ट छिपा दिया। वापस लाने के लिए सूची के नीचे \"छिपे प्रोजेक्ट\" खोलें।"],
  "Could not add it.": ["Não consegui adicionar.", "No pude añadirlo.", "Impossibile aggiungerlo.", "Konnte nicht hinzugefügt werden.", "Impossible de l'ajouter.", "无法添加。", "追加できませんでした。", "जोड़ा नहीं जा सका।"],
  // server errors
  "That is not a folder.": ["Isso não é uma pasta.", "Eso no es una carpeta.", "Questa non è una cartella.", "Das ist kein Ordner.", "Ce n'est pas un dossier.", "这不是文件夹。", "フォルダーではありません。", "यह फ़ोल्डर नहीं है।"],
  "Folder not found.": ["Pasta não encontrada.", "Carpeta no encontrada.", "Cartella non trovata.", "Ordner nicht gefunden.", "Dossier introuvable.", "未找到文件夹。", "フォルダーが見つかりません。", "फ़ोल्डर नहीं मिला।"],
  "Project not found.": ["Projeto não encontrado.", "Proyecto no encontrado.", "Progetto non trovato.", "Projekt nicht gefunden.", "Projet introuvable.", "未找到项目。", "プロジェクトが見つかりません。", "प्रोजेक्ट नहीं मिला।"],
  "Build the graph first.": ["Gere o grafo primeiro.", "Genera el grafo primero.", "Genera prima il grafo.", "Erstelle zuerst den Graphen.", "Générez d'abord le graphe.", "请先生成图谱。", "先にグラフを生成してください。", "पहले ग्राफ़ बनाएँ।"],
  "Invalid question type.": ["Tipo de pergunta inválido.", "Tipo de pregunta no válido.", "Tipo di domanda non valido.", "Ungültiger Fragetyp.", "Type de question invalide.", "无效的问题类型。", "質問の種類が無効です。", "सवाल का प्रकार अमान्य है।"],
  "Fill in the question fields.": ["Preencha os campos da pergunta.", "Rellena los campos de la pregunta.", "Compila i campi della domanda.", "Fülle die Felder der Frage aus.", "Remplissez les champs de la question.", "请填写问题字段。", "質問の欄を入力してください。", "सवाल के फ़ील्ड भरें।"],
};

/** Translates an English UI string; {name} placeholders are filled from vars. */
export function t(key, vars) {
  let s = key;
  if (LANG !== "en") { const row = D[key]; if (row) s = row[ORDER.indexOf(LANG)] ?? key; }
  if (vars) s = s.replace(/\{(\w+)\}/g, (all, k) => (k in vars ? String(vars[k]) : all));
  return s;
}

// ---------- flags (inline SVG: Windows does not draw flag emoji) ----------
const FLAGS = {
  us: '<rect width="21" height="14" fill="#fff"/>' + [0, 2, 4, 6, 8, 10, 12].map(y => `<rect y="${y}" width="21" height="1.08" fill="#b22234"/>`).join("") + '<rect width="9" height="7.5" fill="#3c3b6e"/>',
  br: '<rect width="21" height="14" fill="#009c3b"/><path d="M10.5 1.6 19 7 10.5 12.4 2 7z" fill="#ffdf00"/><circle cx="10.5" cy="7" r="3.2" fill="#002776"/>',
  es: '<rect width="21" height="14" fill="#aa151b"/><rect y="3.5" width="21" height="7" fill="#f1bf00"/>',
  it: '<rect width="7" height="14" fill="#009246"/><rect x="7" width="7" height="14" fill="#fff"/><rect x="14" width="7" height="14" fill="#ce2b37"/>',
  de: '<rect width="21" height="4.67" fill="#000"/><rect y="4.67" width="21" height="4.67" fill="#dd0000"/><rect y="9.33" width="21" height="4.67" fill="#ffce00"/>',
  fr: '<rect width="7" height="14" fill="#0055a4"/><rect x="7" width="7" height="14" fill="#fff"/><rect x="14" width="7" height="14" fill="#ef4135"/>',
  cn: '<rect width="21" height="14" fill="#de2910"/><path d="M4 1.8 4.9 4.3 7.5 4.3 5.4 5.9 6.2 8.4 4 6.9 1.8 8.4 2.6 5.9 0.5 4.3 3.1 4.3z" fill="#ffde00"/>',
  jp: '<rect width="21" height="14" fill="#fff"/><circle cx="10.5" cy="7" r="4.2" fill="#bc002d"/>',
  in: '<rect width="21" height="4.67" fill="#ff9933"/><rect y="4.67" width="21" height="4.67" fill="#fff"/><rect y="9.33" width="21" height="4.67" fill="#138808"/><circle cx="10.5" cy="7" r="1.8" fill="none" stroke="#000080" stroke-width="0.6"/>',
};
const flag = code => `<svg class="flag" viewBox="0 0 21 14" width="21" height="14" aria-hidden="true">${FLAGS[code]}</svg>`;

/** Translates the static HTML (data-i18n*) and adds the language picker next to the "live" indicator. */
function mount() {
  document.documentElement.lang = LANG;
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.textContent.trim());
  for (const el of document.querySelectorAll("[data-i18n-title]")) el.title = t(el.title);
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) el.placeholder = t(el.placeholder);

  const right = document.querySelector(".tb-right");
  if (!right) return;
  const cur = LANGS.find(l => l.code === LANG);
  const box = document.createElement("div");
  box.className = "lang";
  box.innerHTML = `<button type="button" class="lang-btn" aria-haspopup="listbox" aria-expanded="false" title="${t("Language")}">${flag(cur.flag)}<span class="lang-code">${cur.code.toUpperCase()}</span></button>
    <ul class="lang-menu" role="listbox" aria-label="${t("Language")}" hidden>${LANGS.map(l => `<li role="option" aria-selected="${l.code === LANG}" tabindex="0" data-lang="${l.code}">${flag(l.flag)}<span>${l.name}</span></li>`).join("")}</ul>`;
  right.appendChild(box);

  // font picker: white globe button; each option is written in its own font
  const fbox = document.createElement("div");
  fbox.className = "lang fontpick";
  fbox.innerHTML = `<button type="button" class="lang-btn font-btn" aria-haspopup="listbox" aria-expanded="false" title="${t("Font")}" aria-label="${t("Font")}">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4.2" ry="10"/><path d="M12 2v20M3 8h18M2 12h20M3 16h18"/></svg></button>
    <ul class="lang-menu font-menu" role="listbox" aria-label="${t("Font")}" hidden>${FONTS.map(f => `<li role="option" tabindex="0" data-font="${f.id}" aria-selected="${f.id === fontId}" style="font-family:${f.css ?? "'Pixelify Sans'"}">${f.name}${f.id === "default" ? ` <span class="dim">${t("(default)")}</span>` : ""}</li>`).join("")}</ul>`;
  right.insertBefore(fbox, box);
  const fbtn = fbox.querySelector(".font-btn"), fmenu = fbox.querySelector(".font-menu");
  const ftoggle = open => {
    fmenu.hidden = !open; fbtn.setAttribute("aria-expanded", String(open));
    if (open) {
      fmenu.style.left = ""; fmenu.style.right = "";
      if (fmenu.getBoundingClientRect().left < 8) { fmenu.style.left = "0"; fmenu.style.right = "auto"; }   // header wrapped: open to the right
      fmenu.querySelector('[aria-selected="true"]')?.focus();
    }
  };
  const fpick = id => {
    fontId = id; try { localStorage.setItem("office-font", id); } catch {}
    applyFont(id);
    for (const li of fmenu.children) li.setAttribute("aria-selected", String(li.dataset.font === id));
    ftoggle(false); fbtn.focus();
  };
  fbtn.addEventListener("click", e => { e.stopPropagation(); if (fmenu.hidden) toggle(false); ftoggle(fmenu.hidden); });
  fmenu.addEventListener("click", e => { const li = e.target.closest("[data-font]"); if (li) fpick(li.dataset.font); });
  fmenu.addEventListener("keydown", e => {
    const li = e.target.closest("[data-font]"); if (!li) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fpick(li.dataset.font); }
    else if (e.key === "Escape") { ftoggle(false); fbtn.focus(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); (li.nextElementSibling ?? fmenu.firstElementChild).focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); (li.previousElementSibling ?? fmenu.lastElementChild).focus(); }
  });
  document.addEventListener("click", () => ftoggle(false));
  box.addEventListener("click", () => ftoggle(false));
  const btn = box.querySelector(".lang-btn"), menu = box.querySelector(".lang-menu");
  const toggle = open => { menu.hidden = !open; btn.setAttribute("aria-expanded", String(open)); if (open) {
    menu.style.left = ""; menu.style.right = "";
    if (menu.getBoundingClientRect().left < 8) { menu.style.left = "0"; menu.style.right = "auto"; } // header wrapped: open to the right
    menu.querySelector('[aria-selected="true"]')?.focus();
  } };
  const pick = code => { try { localStorage.setItem("office-lang", code); } catch {} location.reload(); };
  btn.addEventListener("click", e => { e.stopPropagation(); toggle(menu.hidden); });
  menu.addEventListener("click", e => { const li = e.target.closest("[data-lang]"); if (li) pick(li.dataset.lang); });
  menu.addEventListener("keydown", e => {
    const li = e.target.closest("[data-lang]"); if (!li) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(li.dataset.lang); }
    else if (e.key === "Escape") { toggle(false); btn.focus(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); (li.nextElementSibling ?? menu.firstElementChild).focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); (li.previousElementSibling ?? menu.lastElementChild).focus(); }
  });
  document.addEventListener("click", () => toggle(false));
}
if (typeof document !== "undefined") mount();
