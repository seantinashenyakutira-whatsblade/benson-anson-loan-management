'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface BusinessInfo {
  name: string;
  phone: string;
  email: string;
  whatsapp: string;
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

/** Public business info from settings + branches (graceful fallbacks, never hardcoded). */
export function useBusinessInfo(): BusinessInfo {
  const [info, setInfo] = useState<BusinessInfo>({
    name: 'Anson Benson Cash Solutions',
    phone: '',
    email: '',
    whatsapp: '',
    locations: [],
  });

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('settings').select('key, value').in('key', ['business_name', 'business_phone', 'business_email', 'business_whatsapp']),
      supabase.from('branches').select('name').eq('is_active', true).order('name'),
    ]).then(([s, b]) => {
      const get = (k: string) => (s.data || []).find((r: { key: string; value: string }) => r.key === k)?.value || '';
      const phone = get('business_phone');
      setInfo({
        name: get('business_name') || 'Anson Benson Cash Solutions',
        phone,
        email: get('business_email'),
        whatsapp: get('business_whatsapp') || phone,
        locations: ((b.data || []) as Array<{ name: string }>).map((x) => x.name),
      });
    });
  }, []);

  return info;
}

export function useProducts(): ProductInfo[] {
  const [products, setProducts] = useState<ProductInfo[]>([]);

  useEffect(() => {
    createClient()
      .from('loan_products')
      .select('id, name, description, min_amount, max_amount, interest_rate, interest_type, default_duration, duration_unit')
      .eq('is_active', true)
      .order('min_amount')
      .then(({ data }) => {
        if (data) setProducts(data as unknown as ProductInfo[]);
      });
  }, []);

  return products;
}

export function formatK(n: number): string {
  return 'K ' + Number(n).toLocaleString('en-ZM', { maximumFractionDigits: 0 });
}
