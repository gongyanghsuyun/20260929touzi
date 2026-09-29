import { functionUrl } from './supabase'

export async function serverRequest<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(functionUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof body.error === 'string' ? body.error : `服务暂时不可用（HTTP ${response.status}）`
    throw new Error(message)
  }
  return body as T
}
