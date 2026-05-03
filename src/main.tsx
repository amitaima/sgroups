import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@styles/tokens.css";
import "./index.css";
import "@styles/globals.scss";
import { App } from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
