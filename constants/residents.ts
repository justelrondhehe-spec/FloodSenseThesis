import { supabase } from './supabase';

export type Resident = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone_number: string | null;
  address: string | null;
};

/** Turns 09171234567, 9171234567, +63 917 123 4567 etc. into +639171234567. Returns null if invalid. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, '');
  let local: string;
  if (/^\+639\d{9}$/.test(digits)) local = digits.slice(3);
  else if (/^639\d{9}$/.test(digits)) local = digits.slice(2);
  else if (/^09\d{9}$/.test(digits)) local = digits.slice(1);
  else if (/^9\d{9}$/.test(digits)) local = digits;
  else return null;
  return `+63${local}`;
}

export async function getResident(userId: string): Promise<Resident | null> {
  const { data, error } = await supabase
    .from('residents')
    .select('id, email, full_name, phone_number, address')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** A resident counts as registered once name and phone are saved. */
export const isProfileComplete = (r: Resident | null) => !!(r?.full_name && r?.phone_number);

export async function saveResident(
  userId: string,
  email: string | undefined,
  fields: { full_name: string; phone_number: string; address: string }
) {
  const { error } = await supabase
    .from('residents')
    .upsert({ id: userId, email: email ?? null, ...fields }, { onConflict: 'id' });
  if (error) throw error;
}
