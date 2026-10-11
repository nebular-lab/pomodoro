import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const router = createRouter({
  routeTree,
  // クエリの値は、JSON として読まず、文字列のまま扱う（"true " を true と読まないため）
  parseSearch: (searchStr) => Object.fromEntries(new URLSearchParams(searchStr)),
  stringifySearch: (search) => {
    const query = new URLSearchParams(
      Object.entries(search).flatMap(([key, value]) =>
        value == null ? [] : [[key, String(value)]],
      ),
    ).toString()
    return query ? `?${query}` : ''
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('app')!

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(<RouterProvider router={router} />)
}
