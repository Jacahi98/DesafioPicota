"use client";

import { useState, useTransition } from "react";
import { PatternLock } from "@/components/pattern-lock";
import { setPatternAction } from "@/app/panel/actions";

export function PatternSetup({
  configured,
  updatedByLabel,
  updatedAtLabel,
  canEdit,
}: {
  configured: boolean;
  updatedByLabel?: string | null;
  updatedAtLabel?: string | null;
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(canEdit && !configured);
  const [first, setFirst] = useState<number[] | null>(null);
  const [mismatch, setMismatch] = useState(false);
  const [attempt, setAttempt] = useState(0);

  function reset() {
    setFirst(null);
    setAttempt((n) => n + 1);
  }

  function handleComplete(sequence: number[]) {
    if (!first) {
      setFirst(sequence);
      setMismatch(false);
      setAttempt((n) => n + 1);
      return;
    }

    const matches = first.length === sequence.length && first.every((d, i) => d === sequence[i]);
    if (!matches) {
      setMismatch(true);
      reset();
      return;
    }

    const formData = new FormData();
    formData.set("sequence", sequence.join(","));
    startTransition(async () => {
      await setPatternAction(formData);
      setEditing(false);
      reset();
    });
  }

  if (!configured && !canEdit) {
    return (
      <div className="rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-5 py-4">
        <p className="font-mono text-sm text-[var(--text-dim)]">
          {"// patrón sin configurar — solo javier tiene permiso"}
        </p>
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-5 py-4">
        <p className="font-mono text-sm text-[var(--text-dim)]">
          patrón activo{updatedByLabel ? ` · fijado por ${updatedByLabel.toLowerCase()}` : ""}
          {updatedAtLabel ? ` el ${updatedAtLabel}` : ""}
        </p>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-mono text-sm text-[var(--pine)] underline underline-offset-2"
          >
            [ cambiar patrón ]
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-5 py-6 shadow-[var(--shadow)]">
      <p className="glow font-mono text-sm font-medium text-[var(--ink)]">
        {first ? "> repite el patrón para confirmarlo_" : "> dibuja el nuevo patrón_"}
      </p>
      <p className="mt-1 font-mono text-xs text-[var(--text-faint)]">
        {"// solo se guarda un hash — ni claude ni nadie más puede ver lo que dibujes"}
      </p>
      <div className="mt-5">
        <PatternLock key={attempt} onComplete={handleComplete} disabled={isPending} status={mismatch ? "error" : "idle"} />
      </div>
      {mismatch && (
        <p className="mt-3 font-mono text-sm text-[var(--accent-rose)]">
          [ no coincide con el primero — vuelve a intentarlo ]
        </p>
      )}
      {configured && (
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            reset();
          }}
          className="mt-4 font-mono text-xs text-[var(--text-faint)] underline underline-offset-2"
        >
          [ cancelar ]
        </button>
      )}
    </div>
  );
}
