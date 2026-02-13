import React, { useState, useCallback } from "react";
import { TerminalContext } from "../context/TerminalContextCore";
import type {
  TerminalMessage,
  TerminalMessageType,
} from "./TerminalContextCore";

export function TerminalProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<TerminalMessage[]>([
    { text: "mkcert engine ready ⚡️", type: "success" },
  ]);

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
