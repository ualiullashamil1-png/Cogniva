import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, ToastProvider } from "./index";
import Showcase from "./Showcase";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider><ToastProvider><Showcase /></ToastProvider></ThemeProvider>
  </React.StrictMode>,
);