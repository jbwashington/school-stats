import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getConferenceColor(conference?: string): string {
  if (!conference) return 'bg-gray-100 text-gray-800'
  
  const colors: Record<string, string> = {
    'SEC': 'bg-red-100 text-red-800',
    'Big Ten': 'bg-blue-100 text-blue-800', 
    'Big 12': 'bg-orange-100 text-orange-800',
    'ACC': 'bg-purple-100 text-purple-800',
    'Pac-12': 'bg-green-100 text-green-800',
    'Big East': 'bg-indigo-100 text-indigo-800',
    'American': 'bg-teal-100 text-teal-800',
    'Mountain West': 'bg-yellow-100 text-yellow-800',
    'Conference USA': 'bg-pink-100 text-pink-800',
    'MAC': 'bg-cyan-100 text-cyan-800',
    'Sun Belt': 'bg-amber-100 text-amber-800',
    'Independent': 'bg-gray-100 text-gray-800',
  }
  
  return colors[conference] || 'bg-slate-100 text-slate-800'
}

export function getDivisionColor(division?: string): string {
  if (!division) return 'bg-gray-100 text-gray-800'
  
  const colors: Record<string, string> = {
    'NCAA DI': 'bg-emerald-100 text-emerald-800',
    'NCAA DII': 'bg-sky-100 text-sky-800', 
    'NCAA DIII': 'bg-violet-100 text-violet-800',
    'NAIA': 'bg-rose-100 text-rose-800',
  }
  
  return colors[division] || 'bg-slate-100 text-slate-800'
}