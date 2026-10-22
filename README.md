# SGP Dashboard — instalador do favorito

Site estático para hospedar no GitHub Pages. Ele oferece o favorito (bookmarklet) do SGP Dashboard com gráfico de pizza, nomes e quantidades nas fatias, listas compactas e atualização automática.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub (por exemplo, `sgp-dashboard`).
2. Envie `index.html`, `bookmarklet.js` e `.nojekyll` para a raiz do repositório.
3. Abra **Settings → Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Escolha a branch `main` e a pasta `/(root)`, depois salve.
6. Aguarde a publicação e use a URL mostrada pelo GitHub Pages.

## Como o funcionário instala o favorito

1. Abra o site publicado.
2. Deixe a barra de favoritos visível no Chrome com `Ctrl+Shift+B`.
3. Arraste o botão verde **SGP Dashboard · Gráfico com rótulos** para a barra de favoritos. O navegador não permite que um site adicione favoritos sem uma ação explícita do usuário.
4. Abra o SGP e faça login.
5. Clique no favorito enquanto estiver numa página do domínio `infoassisnet.sgp.net.br`.

## Importante

- O GitHub Pages hospeda apenas a página de instalação; o dashboard é iniciado pelo favorito no contexto autenticado do SGP.
- O favorito não envia registros para o GitHub Pages nem para outro servidor.
- O repositório e o site do GitHub Pages são públicos. Não adicione credenciais, cookies, tokens ou dados reais de clientes ao repositório.
- Depois de atualizar o bookmarklet, os usuários precisam substituir o favorito antigo pelo novo.
