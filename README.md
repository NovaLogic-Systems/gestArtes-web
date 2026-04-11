# gestArtes Web

Frontend do projeto gestArtes, desenvolvido para a Escola Entartes.

## Stack

- **React** + **Vite**
- **React Router DOM**
- **Axios**

## Requisitos

- **Node.js** compatível com [package.json](package.json) (`^20.19.0 || >=22.12.0`)
- **npm** instalado

## Estrutura

- [api/](api/) - chamadas à API
- [components/](components/) - componentes reutilizáveis
- [context/](context/) - contextos React
- [pages/](pages/) - páginas e vistas
- [public/](public/) - ficheiros públicos
- [src/App.jsx](src/App.jsx) - router principal da aplicação
- [src/main.jsx](src/main.jsx) - ponto de entrada do React
- [src/App.css](src/App.css) - estilos da aplicação
- [src/index.css](src/index.css) - estilos globais
- [src/assets/](src/assets/) - assets internos
- [vite.config.js](vite.config.js) - configuração do Vite
- [eslint.config.js](eslint.config.js) - configuração do lint
- [package.json](package.json) - scripts e dependências

## Configuração

1. Instalar dependências:

```bash
npm install
```

> Se estiveres no PowerShell e o `npm` for bloqueado por policy local, usa `npm.cmd`.

1. Copiar [.env.example](.env.example) para `.env` e ajustar a base URL da API:

```env
VITE_API_URL=http://localhost:3001
```

## Scripts

- `npm run dev` - arrancar o ambiente de desenvolvimento. Definido em [package.json](package.json).
- `npm run build` - gerar a versão de produção. Definido em [package.json](package.json).
- `npm run lint` - validar o código com ESLint. Definido em [package.json](package.json).
- `npm run preview` - pré-visualizar o build localmente. Definido em [package.json](package.json).

## Arranque

```bash
npm run dev
```

Web disponível em `http://localhost:5173`

> ⚠️ A API `gestArtes-api` tem de estar a correr em `http://localhost:3001` para o frontend funcionar corretamente.

## Observações

- O ficheiro [App.js](App.js) na raiz está vazio e não faz parte do build atual.
