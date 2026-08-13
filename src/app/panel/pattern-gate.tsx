"use client";

import { useTransition } from "react";
import { PatternLock } from "@/components/pattern-lock";
import { TerminalBoot } from "@/components/terminal-boot";
import { verifyPatternAction } from "@/app/panel/actions";

const BOOT_LINES = ["conectando con desafio-picota.vercel.app...", "acceso restringido — se requiere patrón"];

export function PatternGate({ error, rateLimited }: { error: boolean; rateLimited: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleComplete(sequence: number[]) {
    const formData = new FormData();
    formData.set("sequence", sequence.join(","));
    startTransition(() => {
      verifyPatternAction(formData);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 py-20">
      <TerminalBoot lines={BOOT_LINES} />
      <p className="glow mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ink)]">
        &gt; patrón_
      </p>
      <div className="mt-8">
        <PatternLock
          onComplete={handleComplete}
          disabled={isPending || rateLimited}
          status={error ? "error" : "idle"}
        />
      </div>
      {rateLimited ? (
        <p className="mt-4 max-w-xs text-center font-mono text-sm text-[var(--accent-rose)]">
          [ demasiados intentos — bloqueado temporalmente ]
        </p>
      ) : (
        error && (
          <p className="mt-4 font-mono text-sm text-[var(--accent-rose)]">[ patrón incorrecto ]</p>
        )
      )}
    </main>
  );
}
