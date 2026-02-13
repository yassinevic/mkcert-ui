import { useContext } from "react";
import { TerminalContext } from "../context/TerminalContextCore";

export function useTerminal() {
    const context = useContext(TerminalContext);
    if (context === undefined) {
        throw new Error("useTerminal must be used within a TerminalProvider");
    }
    return context;
}
