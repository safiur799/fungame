export function formatDrawTime(value: string | Date) {
  const date = new Date(value);
  const datePart = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "Asia/Kolkata"
  })
    .format(date)
    .replace(/\//g, "-");
  const timePart = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata"
  })
    .format(date)
    .toLowerCase();

  return `${datePart}, ${timePart}`;
}

export function formatShortDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "Asia/Kolkata"
  })
    .format(new Date(value))
    .replace(/\//g, "-");
}
