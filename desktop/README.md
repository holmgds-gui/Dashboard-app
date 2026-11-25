
## Apps integrados (1.4.0)

Música (Spotify, YouTube Music, Deezer), IA (ChatGPT, Claude, Gemini, Copilot, Grok) e Mensagens (Gmail, Outlook, WhatsApp Web, Instagram, Telegram) abrem como abas dentro do Today, usando `<webview>`. Cada empresa tem uma sessão separada por app (`persist:today-<empresa>_<app>`). Limite conhecido: o Spotify exige Widevine, que o Electron padrão não traz; use "Abrir no app do PC" nesse caso.
