"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  type Transition,
  type Variant,
  type Variants,
} from "framer-motion";
import { createContext, useContext, useId } from "react";
import { cn } from "@/lib/utils";

export type DisclosureContextType = {
  open: boolean;
  toggle: () => void;
  variants?: { expanded: Variant; collapsed: Variant };
};

const DisclosureContext = createContext<DisclosureContextType | undefined>(undefined);

export type DisclosureProviderProps = {
  children: React.ReactNode;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  variants?: { expanded: Variant; collapsed: Variant };
};

function DisclosureProvider({ children, open, onOpenChange, variants }: DisclosureProviderProps) {
  // `open` es obligatorio (siempre controlado por quien usa <Disclosure>),
  // así que no hace falta duplicarlo en estado interno — eso solo forzaba
  // un useEffect que copiara la prop a estado en cada cambio.
  const toggle = () => {
    onOpenChange?.(!open);
  };

  return <DisclosureContext.Provider value={{ open, toggle, variants }}>{children}</DisclosureContext.Provider>;
}

function useDisclosure() {
  const context = useContext(DisclosureContext);
  if (!context) {
    throw new Error("useDisclosure must be used within a DisclosureProvider");
  }
  return context;
}

export type DisclosureProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  variants?: { expanded: Variant; collapsed: Variant };
  transition?: Transition;
};

export function Disclosure({
  open: openProp = false,
  onOpenChange,
  children,
  className,
  transition,
  variants,
}: DisclosureProps) {
  return (
    <MotionConfig transition={transition}>
      <div className={className}>
        <DisclosureProvider open={openProp} onOpenChange={onOpenChange} variants={variants}>
          {React.Children.toArray(children)[0]}
          {React.Children.toArray(children)[1]}
        </DisclosureProvider>
      </div>
    </MotionConfig>
  );
}

export function DisclosureTrigger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { toggle, open } = useDisclosure();

  return (
    <>
      {React.Children.map(children, (child) => {
        return React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{ className?: string; [key: string]: unknown }>,
              {
                onClick: toggle,
                role: "button",
                "aria-expanded": open,
                tabIndex: 0,
                onKeyDown: (e: { key: string; preventDefault: () => void }) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle();
                  }
                },
                className: cn(className, (child as React.ReactElement<{ className?: string }>).props.className),
              }
            )
          : child;
      })}
    </>
  );
}

export function DisclosureContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const { open, variants } = useDisclosure();
  const uniqueId = useId();

  const BASE_VARIANTS: Variants = {
    expanded: { height: "auto", opacity: 1 },
    collapsed: { height: 0, opacity: 0 },
  };

  const combinedVariants = {
    expanded: { ...BASE_VARIANTS.expanded, ...variants?.expanded },
    collapsed: { ...BASE_VARIANTS.collapsed, ...variants?.collapsed },
  };

  return (
    <div className={cn("overflow-hidden", className)}>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={uniqueId} initial="collapsed" animate="expanded" exit="collapsed" variants={combinedVariants}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
