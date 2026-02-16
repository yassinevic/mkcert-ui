import React, { useState, useCallback, useEffect } from "react";
import { TerminalContext } from "../context/TerminalContextCore";
import type {
  TerminalMessage,
  TerminalMessageType,
} from "./TerminalContextCore";
import { t, translations } from "../i18n";
import { useLocale } from "../hooks/useLocale";

export function TerminalProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  const [messages, setMessages] = useState<TerminalMessage[]>([
    { text: t("terminal.startup"), type: "success" },
  ]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      if (prev[0].type !== "success") return prev;

      const startupTexts = Object.values(translations).map(
        (table) => table["terminal.startup"],
      );
      if (!startupTexts.includes(prev[0].text)) return prev;

      const nextText = t("terminal.startup");
      if (nextText === prev[0].text) return prev;
      return [{ ...prev[0], text: nextText }, ...prev.slice(1)];
    });
  }, [locale]);

  const addMessage = useCallback(
    (text: string, type: TerminalMessageType = "output") => {
      setMessages((prev) => [...prev.slice(-100), { text, type }]);
    },
    [],
  );

  const clearTerminal = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <TerminalContext.Provider value={{ messages, addMessage, clearTerminal }}>
      {children}
    </TerminalContext.Provider>
  );
}
