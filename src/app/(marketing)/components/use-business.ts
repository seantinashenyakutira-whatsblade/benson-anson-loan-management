'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface BusinessInfo {
  name: string;
  phone: string;
  email: string;
  whatsapp: string;
  /** E.164 without '+' for wa.me links. */
  whatsappNumber: string;
  locations: string[];
}

export interface ProductInfo {
  id: string;
  name: string;
  description: string | null;
  min_amount: number;
  max_amount: number;
  interest_rate: number;
  interest_type: string;
  default_duration: number;
  duration_unit: string;
}

const FALLBACK_PHONE = '+260 974 523 857';
const FALLBACK_WHATSAPP_NUMBER = '260776950796';

/** Shareable WhatsApp deep-link (per Stage 2.5 spec). */
export function buildWhatsAppUrl(number: string, customText?: string): string {
  const text =
    customText ??
    `Hello Anson Benson, I'd like to apply for a loan. My name is ___ and I'm interested in a loan of K___ against ___.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/** Public business info from settings + branches (graceful fallbacks, never hardcoded). */
export function useBusinessInfo(): BusinessInfo {
  const [info, setInfo] = useState<BusinessInfo>({
    name: 'Anson Benson Cash Solutions',
    phone: FALLBACK_PHONE,
    email: '',
    whatsapp: '+260 776 950 796',
    whatsappNumber: FALLBACK_WHATSAPP_NUMBER,
    locations: [],
  });

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('settings').select('key, value').in('key', ['business_name', 'business_phone', 'business_email', 'business_whatsapp', 'landing_whatsapp_number']),
      supabase.from('branches').select('name').eq('is_active', true).order('name'),
    ]).then(([s, b]) => {
      const get = (k: string) => (s.data || []).find((r: { key: string; value: string }) => r.key === k)?.value || '';
      const phone = get('business_phone') || FALLBACK_PHONE;
      const waNumber = (get('landing_whatsapp_number') || get('business_whatsapp') || FALLBACK_WHATSAPP_NUMBER).replace(/[^\d]/g, '');
      setInfo({
        name: get('business_name') || 'Anson Benson Cash Solutions',
        phone,
        email: get('business_email'),
        whatsapp: '+260 ' + waNumber.replace(/^260/, '').replace(/^0/, ''),
        whatsappNumber: waNumber,
        locations: ((b.data || []) as Array<{ name: string }>).map((x) => x.name),
      });
    });
  }, []);

  return info;
}

export function formatK(n: number): string {
  return 'K ' + Number(n).toLocaleString('en-ZM', { maximumFractionDigits: 0 });
}
