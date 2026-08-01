export class DateUtils {
  static now(): Date {
    return new Date();
  }

  static addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
  }

  static addDays(date: Date, days: number): Date {
    const res = new Date(date);
    res.setDate(res.getDate() + days);
    return res;
  }

  static isExpired(expiryDate: Date): boolean {
    return new Date() > expiryDate;
  }

  static formatISO(date: Date): string {
    return date.toISOString();
  }
}
