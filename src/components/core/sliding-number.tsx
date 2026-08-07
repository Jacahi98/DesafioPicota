"use client";

// Adaptado del SlidingNumber de motion-primitives: import 'motion/react' ->
// 'framer-motion' (paquete que ya usa el proyecto, misma API) y
// react-use-measure -> useMeasure propio (ver @/lib/use-measure).

import { useEffect, useId } from "react";
import { motion, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useMeasure } from "@/lib/use-measure";

const TRANSITION = {
  type: "spring" as const,
  stiffness: 280,
  damping: 18,
  mass: 0.3,
};

function Digit({ value, place }: { value: number; place: number }) {
  const valueRoundedToPlace = Math.floor(value / place) % 10;
  const animatedValue = useSpring(valueRoundedToPlace, TRANSITION);

  useEffect(() => {
    animatedValue.set(valueRoundedToPlace);
  }, [animatedValue, valueRoundedToPlace]);

  return (
    <div className="relative inline-block w-[1ch] overflow-x-visible overflow-y-clip leading-none tabular-nums">
      <div className="invisible">0</div>
      {Array.from({ length: 10 }, (_, i) => (
        <Number key={i} mv={animatedValue} number={i} />
      ))}
    </div>
  );
}

function Number({ mv, number }: { mv: MotionValue<number>; number: number }) {
  const uniqueId = useId();
  const [ref, bounds] = useMeasure<HTMLSpanElement>();

  const y = useTransform(mv, (latest) => {
    if (!bounds.height) return 0;
    const placeValue = latest % 10;
    const offset = (10 + number - placeValue) % 10;
    let memo = offset * bounds.height;

    if (offset > 5) {
      memo -= 10 * bounds.height;
    }

    return memo;
  });

  if (!bounds.height) {
    return (
      <span ref={ref} className="invisible absolute">
        {number}
      </span>
    );
  }

  return (
    <motion.span
      style={{ y }}
      layoutId={`${uniqueId}-${number}`}
      className="absolute inset-0 flex items-center justify-center"
      transition={TRANSITION}
      ref={ref}
    >
      {number}
    </motion.span>
  );
}

export type SlidingNumberProps = {
  value: number;
  padStart?: boolean;
  decimalSeparator?: string;
  // Fuerza siempre este número de decimales (rellenando con ceros si hace
  // falta), en vez de dejar que toString() se los coma cuando la parte
  // decimal es exactamente 0 (p.ej. value=0 -> "0", no "0.0") — para
  // contadores tipo "x / total" donde el número de dígitos debe ser
  // estable aunque el valor pase por un entero exacto.
  decimalPlaces?: number;
  // Reserva de antemano al menos este número de posiciones para la parte
  // entera (aunque el valor actual necesite menos). Las posiciones de más
  // a la izquierda que el valor todavía no alcanza se quedan invisibles
  // pero YA OCUPAN SU HUECO — así, cuando el valor cruza (9→10, 99→100...)
  // el nuevo dígito aparece (fade-in) en ese hueco ya reservado a la
  // izquierda, en vez de insertar una posición nueva que empuje todo lo de
  // la derecha (el separador, el resto de dígitos, el "/total"...).
  minIntegerDigits?: number;
};

export function SlidingNumber({
  value,
  padStart = false,
  decimalSeparator = ".",
  decimalPlaces,
  minIntegerDigits = 1,
}: SlidingNumberProps) {
  const absValue = Math.abs(value);
  const [integerPart, decimalPart] =
    decimalPlaces !== undefined ? absValue.toFixed(decimalPlaces).split(".") : absValue.toString().split(".");
  const integerValue = parseInt(integerPart, 10);
  const naturalDigits = (padStart && integerValue < 10 ? `0${integerPart}` : integerPart).length;
  const totalSlots = Math.max(naturalDigits, minIntegerDigits);
  const integerPlaces = Array.from({ length: totalSlots }, (_, i) => Math.pow(10, totalSlots - i - 1));

  return (
    <div className="flex items-center">
      {value < 0 && "-"}
      {integerPlaces.map((place) => (
        <motion.div
          key={`pos-${place}`}
          animate={{ opacity: place === 1 || integerValue >= place ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <Digit value={integerValue} place={place} />
        </motion.div>
      ))}
      {decimalPart && (
        <>
          <span>{decimalSeparator}</span>
          {decimalPart.split("").map((_, index) => (
            <Digit
              key={`decimal-${index}`}
              value={parseInt(decimalPart, 10)}
              place={Math.pow(10, decimalPart.length - index - 1)}
            />
          ))}
        </>
      )}
    </div>
  );
}
