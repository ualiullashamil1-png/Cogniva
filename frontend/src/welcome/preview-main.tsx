import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "../design";
import Preview from "./Preview";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><ThemeProvider><Preview /></ThemeProvider></React.StrictMode>,
);