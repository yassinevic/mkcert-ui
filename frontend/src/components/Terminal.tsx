import { useTerminal } from "../hooks/useTerminal";
import { X, Copy, Terminal as TerminalIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import "./Terminal.css";

export function Terminal() {
  const { messages, clearTerminal } = useTerminal();
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const copyToClipboard = () => {
    const text = messages
      .map((m) => (m.type === "command" ? "$ " : "") + m.text)
      .join("\n");
    navigator.clipboard.writeText(text);
  };

  return (
    <div className={`terminal-container ${isMinimized ? "minimized" : ""}`}>
      <div
        className="terminal-header"
        onClick={() => isMinimized && setIsMinimized(false)}
      >
        <div className="terminal-title">
          <div className="terminal-dots">
            <span
              className="terminal-dot red"
              onClick={(e) => {
                e.stopPropagation();
                clearTerminal();
              }}
            ></span>
            <span
              className="terminal-dot yellow"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(true);
              }}
            ></span>
            <span
              className="terminal-dot green"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
            ></span>
          </div>
          <TerminalIcon size={14} className="terminal-icon-main" />
          <span className="terminal-label">mkcert-cli output</span>
        </div>
        <div className="terminal-actions">
          <button
            className="term-btn"
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard();
            }}
            title="Copy all"
          >
            <Copy size={14} />
          </button>
          <button
            className="term-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
          >
            {isMinimized ? <Plus size={14} /> : <X size={14} />}
          </button>
        </div>
      </div>
      {!isMinimized && (
        <div className="terminal-body custom-scrollbar" ref={scrollRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`terminal-line ${msg.type}`}>
              {msg.type === "command" && <span className="prompt">$</span>}
              <span className="text">{msg.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Plus({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}
