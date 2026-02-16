import type { AxiosError } from "axios";
import { t } from "../i18n";

type ApiErrorPayload = {
  error?: string;
};

export const getApiErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<ApiErrorPayload>;
  return (
    axiosError.response?.data?.error ||
    axiosError.message ||
    t("common.unknownError")
  );
};
