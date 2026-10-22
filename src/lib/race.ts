// Momento exacto de la salida: 24 abril 2027 a las 10:00, hora de España
// (horario de verano, +02:00). Si la hora cambia, se cambia solo aquí.
export const RACE_START = Date.parse("2027-04-24T10:00:00+02:00");

// "Sábado 24 de abril de 2027 · 10:00", derivado de RACE_START para no
// duplicar la fecha. Se ensambla a mano con formatToParts y no con format():
// la puntuación literal que mete format() ("sábado, 24 de…") puede diferir
// entre Node y el navegador, y eso rompería la hidratación. Con la zona
// horaria fija el resultado no depende de dónde se ejecute.
export function raceDayLabel(): string {
  const parts = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Madrid",
  }).formatToParts(RACE_START);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";

  const weekday = get("weekday");
  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${weekdayCap} ${get("day")} de ${get("month")} de ${get("year")} · ${get("hour")}:${get("minute")}`;
}
