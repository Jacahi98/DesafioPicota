"use client";

import { useEffect, useRef, useState } from "react";

// Efecto de tecleo línea a línea, una sola vez al montar — capturado en un
// ref (no como dependencia del efecto) para que un re-render del padre
// mientras se dibuja el patrón no reinicie la animación a medias.
export function TerminalBoot({ lines }: { lines: string[] }) {
  const linesRef = useRef(lines);
  const [output, setOutput] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      for (const line of linesRef.current) {
        if (cancelled) return;
        setOutput((prev) => [...prev, ""]);
        for (let i = 1; i <= line.length; i++) {
          if (cancelled) return;
          await new Promise((r) => setTimeout(r, 10));
          setOutput((prev) => {
            const next = prev.slice();
            next[next.length - 1] = line.slice(0, i);
            return next;
          });
        }
      }
      if (!cancelled) setDone(true);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="font-mono text-xs leading-relaxed text-[var(--text-faint)]">
      {output.map((line, i) => (
        <p key={i}>
          {line}
          {done && i === output.length - 1 && <span className="admin-caret" />}
        </p>
      ))}
    </div>
  );
}
