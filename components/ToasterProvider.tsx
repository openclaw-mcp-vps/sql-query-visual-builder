"use client";

import { Toaster } from "react-hot-toast";

export function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "#161b22",
          color: "#c9d1d9",
          border: "1px solid #30363d"
        }
      }}
    />
  );
}
