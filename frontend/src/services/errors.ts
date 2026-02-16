import type { AxiosError } from "axios";

type ApiErrorPayload = {
  error?: string;
};

export const getApiErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<ApiErrorPayload>;
  return (
    axiosError.response?.data?.error ||
    axiosError.message ||
    "Unknown error"
  );
};
