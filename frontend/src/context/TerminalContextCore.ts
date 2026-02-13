import { createContext } from "react";

export type TerminalMessageType = "command" | "output" | "success" | "error";

export interface TerminalMessage {
    text: string;
    type: TerminalMessageType;
}

export interface TerminalContextType {
    messages: TerminalMessage[];
    addMessage: (text: string, type?: TerminalMessageType) => void;
    clearTerminal: () => void;
}

export const TerminalContext = createContext<TerminalContextType | undefined>(undefined);
