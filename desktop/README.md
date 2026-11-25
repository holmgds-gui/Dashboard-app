
## Apps integrados (1.4.0)

Música (Spotify, YouTube Music, Deezer), IA (ChatGPT, Claude, Gemini, Copilot, Grok) e Mensagens (Gmail, Outlook, WhatsApp Web, Instagram, Telegram) abrem como abas dentro do Today, usando `<webview>`. Cada empresa tem uma sessão separada por app (`persist:today-<empresa>_<app>`). Limite conhecido: o Spotify exige Widevine, que o Electron padrão não traz; use "Abrir no app do PC" nesse caso.

## Atualização automática (1.5.0)

O programa procura versão nova ao abrir e a cada 4 horas, baixa em segundo plano (`electron-updater`, via GitHub Releases) e pergunta se quer reiniciar. Cada release precisa ter `latest.yml` e o `.exe` (o workflow já envia). A parte web (telas e apps) sempre atualiza sozinha, sem instalar nada.

## 1.6.0
- **Mini player do Spotify** (Música > Controle): play/pausa, próxima, volume, busca e escolha de dispositivo; precisa de Spotify Premium e de uma vez "Conectar ao Spotify".
- **A janela acompanha o tamanho**: ao diminuir o Today, o conteúdo (botões da janela, barra de abas, apps embutidos) se encaixa no tamanho real da janela em vez de ficar cortado.
- Janela: o Today se ajusta ao tamanho real mesmo com o vidro do Windows.
