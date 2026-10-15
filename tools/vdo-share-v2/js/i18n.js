// Translations for VDO Share v2. Exposes $t() and <lang-switch> to Vue apps.
// The language preference is shared with the rest of the site (same localStorage key).
(function (ns) {
  const LANG_KEY = "siteLang";
  const LOCALES = { en: "en-US", pt: "pt-BR" };

  const messages = {
    en: {
      "lang.label": "Language",
      "app.title": "VDO Share v2",
      "app.howItWorks": "How it works",
      "footer.github": "flaviold on GitHub",

      "create.intro": "Start a session, invite people with a link, and see everyone's shared screens and cameras in one grid. Everything goes peer to peer over WebRTC.",
      "create.title": "New session",
      "create.nickname": "Your nickname",
      "create.nicknamePlaceholder": "How others will see you",
      "create.limit": "Simultaneous shares",
      "create.limitHint": "How many people can share their screen or camera at once (1–{max}).",
      "create.limitWarn": "Above {n} shares, uploads get heavy: each screen or camera is sent separately to every participant.",
      "create.decrease": "Fewer shares",
      "create.increase": "More shares",
      "create.password": "Password (optional)",
      "create.passwordPlaceholder": "Leave empty for an open session",
      "create.passwordHint": "People joining will need it, unless you send them the link with the password.",
      "create.start": "Start session",
      "create.nicknameRequired": "Enter a nickname.",

      "join.title": "Join session",
      "join.intro": "Choose how others will see you.",
      "join.password": "Password",
      "join.passwordIntro": "This session is protected by a password.",
      "join.submit": "Join",
      "join.connecting": "Connecting to the session…",
      "join.connectingHint": "Looking for the other participants. This can take a few seconds.",

      "error.title": "Cannot join the session",
      "error.invalid": "This session link is invalid.",
      "error.notFound": "Session not found or wrong password. The session ends when everyone leaves.",
      "error.publish": "Your screen could not be shared. Try again.",
      "error.retry": "Try again",
      "error.newSession": "Start a new session",

      "session.title": "Session",
      "session.screens": "{n}/{limit} slots",
      "session.participants": "Participants",
      "session.you": "you",
      "session.host": "host",
      "session.copyLink": "Copy link",
      "session.copyLinkPassword": "Copy link with password",
      "session.copied": "Copied!",
      "session.copyPrompt": "Copy this link:",
      "session.share": "Share screen",
      "session.shareCamera": "Share camera",
      "session.stopShare": "Stop sharing",
      "session.connectingShare": "Starting…",
      "session.full": "All {limit} slots are in use",
      "session.leave": "Leave",
      "session.rename": "Change nickname",
      "session.renamePrompt": "New nickname:",
      "session.empty": "Nobody is sharing yet.",
      "session.emptyHint": "Share your screen or camera to be the first, or invite people with the link.",
      "session.waitingVideo": "Connecting…",
      "session.yourScreen": "Your screen",
      "session.yourCamera": "Your camera",
      "session.mute": "Mute",
      "session.unmute": "Unmute",
      "session.stopThis": "Stop",
      "session.stopThisTitle": "End this person's share",
      "session.focusTitle": "Click to enlarge",
      "session.unfocusTitle": "Click to go back to the grid",

      "notice.denied": "All slots are in use. Try again when someone stops sharing.",
      "notice.timeout": "The host did not answer. Try sharing again.",
      "notice.stoppedByHost": "The host ended your share.",
      "notice.nowHost": "You are now the host of this session.",
      "notice.noAudio": "Sharing without audio: your browser or the chosen screen does not provide it.",
      "notice.noMic": "Sharing your camera without audio: no microphone available.",
      "notice.cameraDenied": "Could not access your camera. Check the browser permission.",
      "notice.close": "Dismiss",

      "tour.step": "Step {n} of {total}",
      "tour.skip": "Skip",
      "tour.back": "Back",
      "tour.next": "Next",
      "tour.done": "Done",
      "tour.create.nickname.title": "Pick a nickname",
      "tour.create.nickname.text": "This is how others will see you in the session. It is remembered in this browser.",
      "tour.create.limit.title": "Set the share limit",
      "tour.create.limit.text": "Choose how many people can share their screen or camera at the same time. Anyone can join to watch.",
      "tour.create.password.title": "Add a password (optional)",
      "tour.create.password.text": "With a password, people joining by link must type it, unless you send the link that already includes it.",
      "tour.create.start.title": "Start the session",
      "tour.create.start.text": "You will enter the session and can invite people with its link.",
    },

    pt: {
      "lang.label": "Idioma",
      "app.title": "VDO Share v2",
      "app.howItWorks": "Como funciona",
      "footer.github": "flaviold no GitHub",

      "create.intro": "Inicie uma sessão, convide pessoas com um link e veja as telas e câmeras compartilhadas de todos em um grid. Tudo vai direto entre os participantes, via WebRTC.",
      "create.title": "Nova sessão",
      "create.nickname": "Seu nickname",
      "create.nicknamePlaceholder": "Como os outros vão ver você",
      "create.limit": "Compartilhamentos simultâneos",
      "create.limitHint": "Quantas pessoas podem compartilhar a tela ou a câmera ao mesmo tempo (1–{max}).",
      "create.limitWarn": "Acima de {n} compartilhamentos o upload fica pesado: cada tela ou câmera é enviada separadamente para cada participante.",
      "create.decrease": "Menos compartilhamentos",
      "create.increase": "Mais compartilhamentos",
      "create.password": "Senha (opcional)",
      "create.passwordPlaceholder": "Deixe vazio para uma sessão aberta",
      "create.passwordHint": "Quem entrar vai precisar dela, a não ser que você envie o link com a senha.",
      "create.start": "Iniciar sessão",
      "create.nicknameRequired": "Digite um nickname.",

      "join.title": "Entrar na sessão",
      "join.intro": "Escolha como os outros vão ver você.",
      "join.password": "Senha",
      "join.passwordIntro": "Esta sessão é protegida por senha.",
      "join.submit": "Entrar",
      "join.connecting": "Conectando à sessão…",
      "join.connectingHint": "Procurando os outros participantes. Isso pode levar alguns segundos.",

      "error.title": "Não foi possível entrar na sessão",
      "error.invalid": "O link desta sessão é inválido.",
      "error.notFound": "Sessão não encontrada ou senha incorreta. A sessão termina quando todos saem.",
      "error.publish": "Não foi possível compartilhar sua tela. Tente de novo.",
      "error.retry": "Tentar de novo",
      "error.newSession": "Iniciar uma nova sessão",

      "session.title": "Sessão",
      "session.screens": "{n}/{limit} vagas",
      "session.participants": "Participantes",
      "session.you": "você",
      "session.host": "host",
      "session.copyLink": "Copiar link",
      "session.copyLinkPassword": "Copiar link com senha",
      "session.copied": "Copiado!",
      "session.copyPrompt": "Copie este link:",
      "session.share": "Compartilhar tela",
      "session.shareCamera": "Compartilhar câmera",
      "session.stopShare": "Parar de compartilhar",
      "session.connectingShare": "Iniciando…",
      "session.full": "Todas as {limit} vagas estão em uso",
      "session.leave": "Sair",
      "session.rename": "Trocar nickname",
      "session.renamePrompt": "Novo nickname:",
      "session.empty": "Ninguém está compartilhando ainda.",
      "session.emptyHint": "Compartilhe sua tela ou câmera para ser o primeiro, ou convide pessoas com o link.",
      "session.waitingVideo": "Conectando…",
      "session.yourScreen": "Sua tela",
      "session.yourCamera": "Sua câmera",
      "session.mute": "Silenciar",
      "session.unmute": "Ativar som",
      "session.stopThis": "Encerrar",
      "session.stopThisTitle": "Encerrar o compartilhamento desta pessoa",
      "session.focusTitle": "Clique para ampliar",
      "session.unfocusTitle": "Clique para voltar ao grid",

      "notice.denied": "Todas as vagas estão em uso. Tente de novo quando alguém parar de compartilhar.",
      "notice.timeout": "O host não respondeu. Tente compartilhar de novo.",
      "notice.stoppedByHost": "O host encerrou o seu compartilhamento.",
      "notice.nowHost": "Agora você é o host desta sessão.",
      "notice.noAudio": "Compartilhando sem áudio: seu navegador ou a tela escolhida não oferece áudio.",
      "notice.noMic": "Compartilhando a câmera sem áudio: nenhum microfone disponível.",
      "notice.cameraDenied": "Não foi possível acessar sua câmera. Verifique a permissão do navegador.",
      "notice.close": "Fechar",

      "tour.step": "Passo {n} de {total}",
      "tour.skip": "Pular",
      "tour.back": "Voltar",
      "tour.next": "Próximo",
      "tour.done": "Concluir",
      "tour.create.nickname.title": "Escolha um nickname",
      "tour.create.nickname.text": "É assim que os outros vão ver você na sessão. Ele fica salvo neste navegador.",
      "tour.create.limit.title": "Defina o limite de compartilhamentos",
      "tour.create.limit.text": "Escolha quantas pessoas podem compartilhar a tela ou a câmera ao mesmo tempo. Qualquer pessoa pode entrar para assistir.",
      "tour.create.password.title": "Coloque uma senha (opcional)",
      "tour.create.password.text": "Com senha, quem entrar pelo link precisa digitá-la, a não ser que você envie o link que já inclui a senha.",
      "tour.create.start.title": "Inicie a sessão",
      "tour.create.start.text": "Você entra na sessão e pode convidar pessoas com o link dela.",
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
})(window.VDOShare2);
