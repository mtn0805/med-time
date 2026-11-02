import type { ApiResponse, ApiError } from '@medtime/shared';
export class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = (await response.json().catch(() => null)) as (ApiResponse<T> & ApiError) | null;
  if (!response.ok)
    throw new RequestError(
      json?.error?.message || 'לא ניתן להשלים את הפעולה. נסו שוב.',
      response.status,
      json?.error?.code || 'REQUEST_FAILED',
    );
  if (!json)
    throw new RequestError('התקבלה תשובה לא תקינה מהשרת', response.status, 'INVALID_RESPONSE');
  return json.data;
}
export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
};
