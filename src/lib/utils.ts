import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converte reais para centavos (inteiro)
 * @param reais - Valor em reais (ex: 8.50)
 * @returns Valor em centavos (ex: 850)
 */
export function reaisToCentavos(reais: number): number {
  return Math.round(reais * 100)
}

/**
 * Converte centavos para reais
 * @param centavos - Valor em centavos (ex: 850)
 * @returns Valor em reais (ex: 8.50)
 */
export function centavosToReais(centavos: number): number {
  return centavos / 100
}

/**
 * Formata valor em centavos para exibição em reais
 * @param centavos - Valor em centavos (ex: 850)
 * @returns String formatada (ex: "R$ 8,50")
 */
export function formatarReais(centavos: number): string {
  const reais = centavosToReais(centavos)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(reais)
}

/**
 * Formata valor em centavos para exibição em reais sem símbolo da moeda
 * @param centavos - Valor em centavos (ex: 850)
 * @returns String formatada (ex: "8,50")
 */
export function formatarReaisSemSimbolo(centavos: number): string {
  const reais = centavosToReais(centavos)
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(reais)
}
