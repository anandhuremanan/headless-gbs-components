import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WebMcpDemo } from "./WebMcpDemo";
import "../index.css";
import "@/components/data-grid/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WebMcpDemo />
  </StrictMode>,
);
