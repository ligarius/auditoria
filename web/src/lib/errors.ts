import { isAxiosError } from 'axios';

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const title = error.response?.data as { title?: string } | undefined;
    if (title?.title) {
      return title.title;
    }
    if (typeof error.message === 'string' && error.message.length > 0) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return fallback;
};
