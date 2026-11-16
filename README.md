# Today

Painel pessoal em vidro fosco, para PC e celular: seletor de IA, agenda com lembretes, WhatsApp e e-mail, pagamentos e Pix, finanças com carteiras e metas, tarefas, estudos, hábitos, notas, salvos e a loja da Fire Taste.

- **App:** https://holmgds-gui.github.io/Dashboard-app/
- **Instalar:** no Chrome, menu ⋮ → Instalar app. No iPhone, Safari → Compartilhar → Adicionar à Tela de Início.
- **Dados:** cada conta guarda seu estado na tabela `today_state` do Supabase, protegida por RLS (cada usuário só lê e escreve a própria linha). A chave no código é a chave pública (publishable) do projeto.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | O app inteiro (HTML, CSS e JS num arquivo) |
| `manifest.webmanifest` | Nome, ícones e cores para instalar |
| `sw.js` | Service worker: abre rápido e funciona sem internet |
| `icons/` | Ícones do app |

Ao publicar uma versão nova, mude `VERSION` em `sw.js` para os aparelhos baixarem a atualização.

## Today para Windows (vidro de verdade)

A pasta `desktop/` tem o programa de PC (Electron). A janela usa o efeito acrílico do Windows 11: o app fica como vidro e mostra a área de trabalho desfocada atrás. O conteúdo é o mesmo site acima, então login, dados e atualizações são iguais.

- **Instalar:** baixe `Today-Setup-x.y.z.exe` em [Releases](https://github.com/holmgds-gui/Dashboard-app/releases). O GitHub gera o instalador sozinho a cada mudança em `desktop/` (veja a aba Actions).
- **Rodar sem instalar (com Node.js):** `cd desktop && npm install && npm start`.
- O instalador não é assinado: o Windows pode mostrar "O Windows protegeu o computador". Clique em **Mais informações** e depois em **Executar assim mesmo**.

### Barra flutuante e empresas

- **Minimizar vira barra:** ao minimizar a janela do Today no Windows, ela vira uma barra de vidro pequena, sempre por cima. Clique num ícone para abrir o Today naquela página. Arraste pela alça para mudar de lugar (a posição fica salva). Liga/desliga em Ajustes > Barra de atalhos.
- **Só o botão do Today:** na barra flutuante, o botão de menos minimiza a barra para virar só a logo. Clique na logo para abrir a barra de novo; arraste para mudar de lugar.
- **Botões da janela:** minimizar, maximizar e fechar ficam numa faixa própria no topo, sem cobrir o desenho do app.
- **Barra editável:** ordem, ícones, itens visíveis, formato (vertical ou horizontal) e posição (esquerda, direita, topo, embaixo). Clique com o botão direito na barra para editar.
- **Empresas:** um login só, vários espaços com dados separados. Troque pela barra, pelo topo ou em Ajustes > Empresas.
