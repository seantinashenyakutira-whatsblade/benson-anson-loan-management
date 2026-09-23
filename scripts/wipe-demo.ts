// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

function loadEnv(){
  if(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const p='.env.local';
  if(!existsSync(p)) return;
  for(const line of readFileSync(p,'utf8').split('\n')){
    const t=line.trim(); if(!t||t.startsWith('#')) continue;
    const i=t.indexOf('='); if(i===-1) continue;
    let k=t.slice(0,i).trim(), v=t.slice(i+1).trim();
    if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1);
    if(!process.env[k]) process.env[k]=v;
  }
}
loadEnv();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {auth:{persistSession:false}});

async function wipe(){
  console.log('Wiping demo data (preserving profiles, branches, loan_products, settings)...');
  // FK-safe order: children first
  const steps: Array<[string,string]> = [
    ['loan_officer_notes','loan_id'],
    ['penalties','loan_id'],
    ['payment_allocations','loan_id'],
    ['payments','loan_id'],
    ['loan_schedule','loan_id'],
    ['loans','customer_id'],
    ['loan_applications','customer_id'],
    ['collateral_media','collateral_id'],
    ['collateral','customer_id'],
    ['customer_documents','customer_id'],
    ['income_records','branch_id'],
    ['expenses','branch_id'],
    ['onboarding_documents','submission_id'],
    ['onboarding_submissions','invitation_id'],
    ['customer_invitations','branch_id'],
    ['customers','branch_id'],
  ];
  // For tables without FK to preserved tables, delete all. For others, delete where exists.
  // Simplest: delete all rows via service role (bypasses RLS) by selecting ids and deleting.
  // We use a broad delete: delete where id is not null (all rows) using a dummy filter that matches all.

  // Special: need to handle tables that may not exist or be empty
  const tables = [
    'loan_officer_notes',
    'penalties',
    'payment_allocations',
    'payments',
    'loan_schedule',
    'loans',
    'loan_applications',
    'application_decisions',
    'collateral_media',
    'collateral',
    'customer_documents',
    'income_records',
    'expenses',
    'audit_logs',
    'notifications',
    'onboarding_documents',
    'onboarding_submissions',
    'customer_invitations',
    'customers',
  ];

  for(const t of tables){
    // Use a delete with a condition that matches all rows: ne id = '00000000-0000-0000-0000-000000000000' (all real ids are not this)
    // Supabase requires a filter; we use .neq('id', '00000000-0000-0000-0000-000000000000')
    const { error, count } = await (supabase.from(t) as any).delete({count:'exact'}).neq('id','00000000-0000-0000-0000-000000000000');
    if(error){
      // Table may not exist or RLS issue — try alternative: select then delete ids
      console.warn(`  ${t}: ${error.message} (trying fallback)`);
      const { data } = await supabase.from(t).select('id').limit(1000);
      if(data && data.length>0){
        const ids = data.map((r:any)=>r.id);
        const { error: e2 } = await supabase.from(t).delete().in('id', ids);
        if(e2) console.warn(`  ${t} fallback: ${e2.message}`);
        else console.log(`  ${t}: wiped ${ids.length} (fallback)`);
      } else {
        console.log(`  ${t}: 0 (empty or fallback found none)`);
      }
    } else {
      console.log(`  ${t}: wiped ${count ?? 0}`);
    }
  }
  console.log('Wipe complete. Verify preserved tables:');
  for(const t of ['profiles','branches','loan_products','settings']){
    const { count } = await supabase.from(t).select('id',{count:'exact',head:true});
    console.log(`  ${t}: ${count} (preserved)`);
  }
}

wipe().catch(e=>{ console.error(e); process.exit(1); });
