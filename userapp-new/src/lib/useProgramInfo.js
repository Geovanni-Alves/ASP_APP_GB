// src/lib/useProgramInfo.js
// What the family needs to know about the program: how long the pictures stay, and how to reach it.
// It is asked once and kept (the next screens use the same answer).
import { useEffect, useState } from "react";
import api from "./api";

let cached = null;

export default function useProgramInfo() {
  const [info, setInfo] = useState(
    cached || {
      mediaRetentionDays: 60,
      programName: null,
      programPhone: null,
      programEmail: null,
    },
  );

  useEffect(() => {
    if (cached) return;
    api
      .get("/parent/settings")
      .then(({ data }) => {
        cached = data;
        setInfo(data);
      })
      .catch(() => {});
  }, []);

  return info;
}
