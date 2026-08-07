// Progresión real (distancia y desnivel+ acumulados) a lo largo de un
// trazado, para leerla en un punto concreto de drawProgress — la misma
// fracción 0–1 que ya usan RouteMap/ElevationProfile para dibujar. La
// distancia recorrida es directa (drawProgress ES la fracción de
// distancia), pero el desnivel+ acumulado hasta ese punto no lo es: solo
// sube en los tramos donde el trazado asciende, así que hace falta el
// mismo bracket por fracción que usan esos componentes para dibujar.

type TrackPoint = readonly [number, number, number, number];

export type TrackProgress = {
  distFractions: number[];
  cumGainM: number[];
};

// gainM: el desnivel+ TOTAL real de la modalidad (stats.gainM, medido
// sobre el track GPS original, con todos sus puntos). El track que se
// dibuja aquí está re-muestreado a muchos menos puntos (50, ver
// route-track.ts), así que sumar sus subidas punto a punto da un ascenso
// menor que el real — se pierden las pequeñas subidas y bajadas que caían
// entre dos puntos conservados. Sin corregir esto, el contador de
// progreso nunca llegaría al 100% al final del recorrido. Se reescala la
// curva completa para que el ÚLTIMO valor coincida exactamente con el
// total real, conservando la forma relativa (dónde se acumula más o menos
// desnivel a lo largo del trazado).
export function buildTrackProgress(track: TrackPoint[], distanceM: number, gainM: number): TrackProgress {
  const distFractions = track.map((p) => p[3] / distanceM);
  const rawCumGainM: number[] = [0];
  for (let i = 1; i < track.length; i++) {
    rawCumGainM.push(rawCumGainM[i - 1] + Math.max(0, track[i][2] - track[i - 1][2]));
  }
  const rawTotal = rawCumGainM[rawCumGainM.length - 1];
  const scale = rawTotal > 0 ? gainM / rawTotal : 0;
  const cumGainM = rawCumGainM.map((g) => g * scale);
  return { distFractions, cumGainM };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

export function gainAtFraction({ distFractions, cumGainM }: TrackProgress, fraction: number) {
  const v = clamp(fraction, 0, 1);
  let i = 1;
  while (i < distFractions.length - 1 && distFractions[i] < v) i++;
  const segStart = distFractions[i - 1];
  const segEnd = distFractions[i];
  const segFrac = segEnd > segStart ? (v - segStart) / (segEnd - segStart) : 0;
  return cumGainM[i - 1] + (cumGainM[i] - cumGainM[i - 1]) * segFrac;
}
