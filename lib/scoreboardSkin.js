"use client";
import { useState, useEffect } from "react";

export function useSkin() {
  const [layout, setLayoutState] = useState("apilado"); // 'apilado' | 'vertical'
  const [marks, setMarksState] = useState("palito"); // 'palito' | 'fosforo'

  useEffect(() => {
    try {
      const l = window.localStorage.getItem("torneotruco:skin-layout");
      const m = window.localStorage.getItem("torneotruco:skin-marks");
      if (l) setLayoutState(l);
      if (m) setMarksState(m);
    } catch (e) {
      /* sin preferencia guardada todavía */
    }
  }, []);

  function setLayout(v) {
    setLayoutState(v);
    try {
      window.localStorage.setItem("torneotruco:skin-layout", v);
    } catch (e) {}
  }
  function setMarks(v) {
    setMarksState(v);
    try {
      window.localStorage.setItem("torneotruco:skin-marks", v);
    } catch (e) {}
  }

  return { layout, marks, setLayout, setMarks };
}
