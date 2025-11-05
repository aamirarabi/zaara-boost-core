import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Pakistan-specific formatting utilities
export function formatPKRCurrency(amount: number | null | undefined): string {
  if (!amount && amount !== 0) return "PKR 0";
  return `PKR ${amount.toLocaleString('en-PK')}`;
}

export function formatPakistanDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

export function formatPakistanDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Date part
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  
  // Time part (12-hour format with AM/PM)
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // Convert to 12-hour format
  
  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
}

export function formatPakistanTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === 'string' ? new Date(date) : date;
  
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  
  return `${hours}:${minutes} ${ampm}`;
}

export function getPakistanMonthName(): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[new Date().getMonth()];
}
