export function formatDate(value: string | Date, locale = "da-DK") {
  return new Date(value).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatTime(value: string | Date, locale = "da-DK") {
  return new Date(value).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getWeekday(value: string | Date, locale = "da-DK") {
  return new Date(value).toLocaleDateString(locale, {
    weekday: "long",
  });
}

export function isToday(value: string | Date) {
  const today = new Date();
  const date = new Date(value);

  return (
    today.getDate() === date.getDate() &&
    today.getMonth() === date.getMonth() &&
    today.getFullYear() === date.getFullYear()
  );
}

export function getRelativeTime(value: string | Date) {
  const now = new Date();
  const date = new Date(value);

  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 1000 / 60);

  if (minutes < 60) {
    return `${minutes} min siden`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} timer siden`;
  }

  const days = Math.floor(hours / 24);

  return `${days} dage siden`;
}
