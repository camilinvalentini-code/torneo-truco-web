"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

export const LIGHT = {
  bg: "#EAF3EC",
  panel: "#FFFFFF",
  panelLight: "#F1F7F1",
  ink: "#33453E",
  inkDim: "#84958C",
  gold: "#EAC27A",
  goldBright: "#C6902E",
  red: "#D98A82",
  redDim: "#B85C55",
  line: "#DCEAE0",
};
export const DARK = {
  bg: "#152420",
  panel: "#1E332B",
  panelLight: "#26392F",
  ink: "#EDE6D6",
  inkDim: "#93A69B",
  gold: "#E3B563",
  goldBright: "#F2CE87",
  red: "#D98A82",
  redDim: "#E8A39B",
  line: "#334A3F",
};
export const INK_ON_LIGHT = "#33453E";
export const BANNER = { bg: "#FBF3E3", ink: "#33453E", accent: "#B85C55" };

const ThemeCtx = createContext({ theme: "light", T: LIGHT, toggle: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const saved = window.localStorage.getItem("torneotruco:theme");
    if (saved === "dark" || saved === "light") setTheme(saved);
  }, []);

  function toggle() {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      window.localStorage.setItem("torneotruco:theme", next);
      return next;
    });
  }

  const T = theme === "dark" ? DARK : LIGHT;

  useEffect(() => {
    document.body.style.background = T.bg;
  }, [T.bg]);

  return <ThemeCtx.Provider value={{ theme, T, toggle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
