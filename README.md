# 🚴 Pedal Turbo 3D — EVOLUTION 3.0

Jogo de corrida arcade 3D desenvolvido para a **Panobianco Embu das Artes**. Inspirado em jogos cartoon de corrida, com mecânicas próprias. Projeto experimental e não oficial.

## Arquivos

- `index.html`: telas, botões e HUD
- `style.css`: identidade visual e responsividade
- `game.js`: motor de jogo, renderização Three.js, colisões, pontuação e controles
- `assets/capa.png`: capa inicial

## Para publicar no GitHub Pages

1. Entre no repositório `Pedal-Panobiando-Embu-das-Artes`.
2. Em **Code**, exclua/substitua os arquivos antigos se necessário. Envie **index.html**, **style.css**, **game.js** e a pasta **assets** com **capa.png** para a **raiz** do repositório, mantendo exatamente os nomes e a estrutura.
3. Confirme as alterações na branch `main`.
4. Em **Settings → Pages**, escolha **Deploy from a branch**, branch `main`, pasta `/(root)` e clique em **Save**.
5. Na aba **Actions**, aguarde a execução verde `pages build and deployment`.
6. Abra https://luizklak-crypto.github.io/Pedal-Panobiando-Embu-das-Artes/ . Se a página ainda mostrar a versão anterior, pressione Ctrl+Shift+R (no celular, reabra em aba anônima).

## Jogabilidade

- Mover: ◀ ▶, setas, A/D ou deslizar horizontalmente.
- Pular: botão PULAR, espaço, seta para cima ou deslizar para cima.
- Turbo: botão TURBO (exige 40% de carga), Shift ou deslizar para baixo.
- Moedas: +50 pontos e +8% de turbo.
- Energia: +35% de turbo.
- Barreiras: pular para ganhar 120 pontos; bater reduz uma vida.
- Monstros do cotidiano: desviar. Três vidas por partida.
- Pontos somam ao percorrer a pista, ao pegar coletáveis e ao executar combos.
- Recorde gravado no navegador (localStorage). Não há ranking compartilhado entre dispositivos.
- Compartilhar resultado: usa compartilhamento nativo ou cópia de texto, conforme o navegador.

## Requisitos

Navegador atualizado com WebGL. **Precisa de internet** para carregar Three.js da CDN `cdn.jsdelivr.net`. Os demais arquivos são estáticos e rodam pelo GitHub Pages sem servidor adicional.

## Nota sobre a marca

O jogo apresenta identificação textual estilizada "PANOBIANCO / EMBU DAS ARTES" e um monograma genérico PB, não o arquivo vetorial oficial da marca. Para uso institucional, substitua pelo logotipo aprovado pela academia.
