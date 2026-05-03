export class AppError extends Error {
  public readonly code: string;

  public constructor(message: string, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

/** PostgREST cuando la tabla aún no existe o no está en la caché del API. */
export function isMissingShoppingListTableError(error: unknown): boolean {
  const msg =
    error instanceof AppError
      ? error.message
      : error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : '';
  return msg.includes('shopping_list_items');
}
