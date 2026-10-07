// Translations for the VDO Share pages. Exposes $t() and <lang-switch> to Vue apps.
// The language preference is shared with the site home page (same localStorage key).
(function (ns) {
  const LANG_KEY = "siteLang";
  const LOCALES = { en: "en-US", pt: "pt-BR" };

  const messages = {
    en: {
      "lang.label": "Language",

      "action.copy": "Copy",
      "action.copied": "Copied!",
      "action.copyLink": "Copy link",
      "action.copyPrompt": "Copy this link:",
      "action.preview": "Preview",
      "action.remove": "Remove",
      "action.open": "Open",

      "list.title": "VDO Share",
      "list.intro": "Create links for people to share their camera or screen, then combine two of them into a display page.",
      "list.howItWorks": "How it works",

      "create.title": "New share link",
      "create.labelPlaceholder": "Label (optional)",
      "create.labelAria": "Label",
      "create.submit": "Generate link",
      "create.sendHint": "Send this link to the person who will share:",
      "create.linkAria": "Share link",

      "shares.title": "Shares",
      "shares.refresh": "Status refreshes every {s}s",
      "shares.empty": "No shares yet. Generate a link above.",
      "shares.colDisplay": "Display",
      "shares.colDisplayHint": "Select two shares for the display page",
      "shares.colStatus": "Status",
      "shares.colLabel": "Label",
      "shares.colId": "ID",
      "shares.colCreated": "Created",
      "shares.removeConfirm": "Remove \"{name}\"? Its links will stop being listed here.",

      "status.active": "Active",
      "status.inactive": "Inactive",
      "status.checking": "Checking…",

      "display.title": "Display page",
      "display.hint": "Select two shares in the list ({n}/2 selected). The first one selected is feed A.",
      "display.linkAria": "Display link",

      "demo.camera": "Camera",
      "demo.screen": "Screen",
      "tour.step": "Step {n} of {total}",
      "tour.skip": "Skip",
      "tour.back": "Back",
      "tour.next": "Next",
      "tour.done": "Done",
      "tour.create.title": "Create a share link",
      "tour.create.text": "Give it an optional label and click Generate link. Send the link to the person who will share. They choose camera or screen inside VDO.Ninja.",
      "tour.shares.title": "Track your shares",
      "tour.shares.text": "Every link you create is saved in this browser. Status turns Active while someone is sharing on that link. Use Copy link, Preview or Remove on each one.",
      "tour.select.title": "Pick two feeds",
      "tour.select.text": "Tick the Display box on two shares. The first one you tick is feed A, the second is feed B.",
      "tour.display.title": "Open the display page",
      "tour.display.text": "Copy or open the display link. There you can show the feeds side by side or stacked, drag the divider, or turn either feed into a movable thumbnail.",

      "view.title": "VDO Share Display",
      "view.errorTitle": "Cannot open display",
      "view.errorMissing": "The link must contain two share IDs (?a=...&b=...).",
      "view.errorInvalid": "One of the share IDs in the link is invalid.",
      "view.back": "Back to shares",
      "view.feed": "Feed {name}",
      "view.dragMove": "Drag to move",
      "view.dragResize": "Drag to resize",
      "view.sideBySide": "Side by side",
      "view.stacked": "Stacked",
      "view.split": "Split",
      "view.thumbA": "Thumbnail A",
      "view.thumbB": "Thumbnail B",
      "view.swap": "Swap",
      "view.fullscreen": "Fullscreen",
      "view.exitFullscreen": "Exit fullscreen",
    },

    pt: {
      "lang.label": "Idioma",

      "action.copy": "Copiar",
      "action.copied": "Copiado!",
      "action.copyLink": "Copiar link",
      "action.copyPrompt": "Copie este link:",
      "action.preview": "Visualizar",
      "action.remove": "Remover",
      "action.open": "Abrir",

      "list.title": "VDO Share",
      "list.intro": "Crie links para as pessoas compartilharem a câmera ou a tela e combine dois deles em uma página de exibição.",
      "list.howItWorks": "Como funciona",

      "create.title": "Novo link de compartilhamento",
      "create.labelPlaceholder": "Nome (opcional)",
      "create.labelAria": "Nome",
      "create.submit": "Gerar link",
      "create.sendHint": "Envie este link para a pessoa que vai compartilhar:",
      "create.linkAria": "Link de compartilhamento",

      "shares.title": "Compartilhamentos",
      "shares.refresh": "O status atualiza a cada {s}s",
      "shares.empty": "Nenhum compartilhamento ainda. Gere um link acima.",
      "shares.colDisplay": "Exibir",
      "shares.colDisplayHint": "Selecione dois compartilhamentos para a página de exibição",
      "shares.colStatus": "Status",
      "shares.colLabel": "Nome",
      "shares.colId": "ID",
      "shares.colCreated": "Criado em",
      "shares.removeConfirm": "Remover \"{name}\"? Os links dele deixarão de aparecer aqui.",

      "status.active": "Ativo",
      "status.inactive": "Inativo",
      "status.checking": "Verificando…",

      "display.title": "Página de exibição",
      "display.hint": "Selecione dois compartilhamentos na lista ({n}/2 selecionados). O primeiro selecionado é o feed A.",
      "display.linkAria": "Link de exibição",

      "demo.camera": "Câmera",
      "demo.screen": "Tela",
      "tour.step": "Passo {n} de {total}",
      "tour.skip": "Pular",
      "tour.back": "Voltar",
      "tour.next": "Próximo",
      "tour.done": "Concluir",
      "tour.create.title": "Crie um link de compartilhamento",
      "tour.create.text": "Dê um nome opcional e clique em Gerar link. Envie o link para a pessoa que vai compartilhar. Ela escolhe câmera ou tela dentro do VDO.Ninja.",
      "tour.shares.title": "Acompanhe seus compartilhamentos",
      "tour.shares.text": "Todo link criado fica salvo neste navegador. O status fica Ativo enquanto alguém está compartilhando naquele link. Use Copiar link, Visualizar ou Remover em cada um.",
      "tour.select.title": "Escolha dois feeds",
      "tour.select.text": "Marque a caixa Exibir em dois compartilhamentos. O primeiro marcado é o feed A, o segundo é o feed B.",
      "tour.display.title": "Abra a página de exibição",
      "tour.display.text": "Copie ou abra o link de exibição. Lá você pode mostrar os feeds lado a lado ou empilhados, arrastar o divisor ou transformar qualquer feed em uma miniatura móvel.",

      "view.title": "VDO Share – Exibição",
      "view.errorTitle": "Não foi possível abrir a exibição",
      "view.errorMissing": "O link precisa ter dois IDs de compartilhamento (?a=...&b=...).",
      "view.errorInvalid": "Um dos IDs de compartilhamento do link é inválido.",
      "view.back": "Voltar aos compartilhamentos",
      "view.feed": "Feed {name}",
      "view.dragMove": "Arraste para mover",
      "view.dragResize": "Arraste para redimensionar",
      "view.sideBySide": "Lado a lado",
      "view.stacked": "Empilhado",
      "view.split": "Dividido",
      "view.thumbA": "Miniatura A",
      "view.thumbB": "Miniatura B",
      "view.swap": "Inverter",
      "view.fullscreen": "Tela cheia",
      "view.exitFullscreen": "Sair da tela cheia",
    },
  };

  function detectLang() {
    try {
      const stored = localStorage.getItem(LANG_KEY);
      if (stored in messages) return stored;
    } catch (e) {
      // Storage unavailable: fall back to the browser language.
    }
    const preferred = navigator.languages || [navigator.language || ""];
    return preferred.some((l) => l.toLowerCase().startsWith("pt")) ? "pt" : "en";
  }

  const state = Vue.reactive({ lang: detectLang() });

  function t(key, params = {}) {
    const text = messages[state.lang][key] ?? messages.en[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? "");
  }

  function setLang(lang) {
    if (!(lang in messages) || lang === state.lang) return;
    state.lang = lang;
    if (ns.track) ns.track("language-changed", { lang });
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (e) {
      // Not persisted; the choice still applies to this page.
    }
  }

  const locale = () => LOCALES[state.lang];

  const LangSwitch = {
    template: `
      <div class="lang-switch" role="group" :aria-label="$t('lang.label')">
        <button v-for="lang in ['en', 'pt']" :key="lang" type="button"
                :class="{ active: $i18n.lang === lang }" :aria-pressed="$i18n.lang === lang"
                @click="setLang(lang)">{{ lang.toUpperCase() }}</button>
      </div>`,
    methods: { setLang },
  };

  // titleKey: message used for document.title, kept in sync with the language.
  function plugin(titleKey) {
    return {
      install(app) {
        app.config.globalProperties.$t = t;
        app.config.globalProperties.$i18n = state;
        app.component("lang-switch", LangSwitch);
        Vue.watchEffect(() => {
          document.documentElement.lang = locale();
          if (titleKey) document.title = t(titleKey);
        });
      },
    };
  }

  ns.i18n = { t, setLang, locale, plugin, state };
})(window.VDOShare);
