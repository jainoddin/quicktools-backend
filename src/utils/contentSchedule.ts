export const getKolkataDateString = (): string => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

export const getKolkataStartOfDay = (): Date => new Date(`${getKolkataDateString()}T00:00:00+05:30`);
