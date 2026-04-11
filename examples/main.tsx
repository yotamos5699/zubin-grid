import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { TinyExampleApp } from "./tiny-example-ui.js";

import "./styles.css";

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Missing #app root element.");
}

createRoot(rootElement).render(
  <StrictMode>
    <TinyExampleApp />
  </StrictMode>,
);
