import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Certificates } from "./pages/Certificates";
import { Authorities } from "./pages/Authorities";
import { Terminal } from "./components/Terminal";
import { TerminalProvider } from "./context/TerminalContext";
import { ThemeProvider } from "./context/ThemeContext";
import "./App.css";

function App() {
  return (
    <ThemeProvider>
      <TerminalProvider>
        <BrowserRouter>
          <div className="app-container">
            <Sidebar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Certificates />} />
                <Route path="/authorities" element={<Authorities />} />
                <Route path="/settings" element={<Navigate to="/authorities" replace />} />
              </Routes>
              <Terminal />
            </main>
          </div>
        </BrowserRouter>
      </TerminalProvider>
    </ThemeProvider>
  );
}

export default App;
