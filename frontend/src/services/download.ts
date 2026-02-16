import { exportAllCertificates, getDownloadUrl } from "./api";

type DownloadResult = {
  filename: string;
};

const getHeader = (headers: Record<string, unknown> | undefined, key: string) => {
  if (!headers) return "";
  const value = headers[key] ?? headers[key.toLowerCase()];
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "";
  return String(value);
};

export const downloadAllCertificates = async (): Promise<DownloadResult> => {
  const response = await exportAllCertificates();
  const contentType = getHeader(response.headers, "content-type") || "application/zip";
  const contentDisposition = getHeader(response.headers, "content-disposition");
  const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  const filename = filenameMatch?.[1] || "all_certificates.zip";

  const blob = new Blob([response.data], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return { filename };
};

export const downloadCertificate = (id: number) => {
  window.location.href = getDownloadUrl(id);
};
