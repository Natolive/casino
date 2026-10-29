// $fetch vers l'API (servie par le front sous /api), cookie du joueur inclus.
export const useApi = () => $fetch.create({ baseURL: '/api', credentials: 'include' })

// Message renvoyé par l'API (erreur métier ou validation), sinon message générique.
export const apiErrorMessage = (e: unknown) =>
  (e as { data?: { message?: string } }).data?.message ?? 'Le croupier ne répond pas, réessaie dans un instant.'
