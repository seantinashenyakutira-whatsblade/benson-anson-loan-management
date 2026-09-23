// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';

// ── Env ───────────────────────────────────────────────────────────────
function loadEnv() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const path = '.env.local';
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    let k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !serviceKey) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

// ── Helpers ───────────────────────────────────────────────────────────
const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const choice = <T,>(arr: T[]): T => arr[rand(0, arr.length - 1)] as T;
const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

function nrc(i: number): string {
  const a = String(100000 + (i % 900000)).padStart(6, '0');
  const b = String(10 + (i % 90)).padStart(2, '0');
  const c = String((i % 9) + 1);
  return `${a}/${b}/${c}`;
}
function phone(i: number): string {
  const prefixes = ['+260977', '+260966', '+260955', '+260977', '+260966', '+260955', '+260777', '+260766'];
  const p = prefixes[i % prefixes.length];
  const suffix = String(1000000 + (i * 12345) % 9000000).padStart(7, '0');
  return `${p}${suffix}`;
}
function altPhone(i: number): string | null {
  return i % 3 === 0 ? phone(i + 1000) : null;
}
function dob(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  d.setMonth(rand(0, 11));
  d.setDate(rand(1, 28));
  return d.toISOString().slice(0, 10);
}
function fmtDate(d: Date): string { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function addWeeks(d: Date, n: number): Date { return addDays(d, n * 7); }
function addMonths(d: Date, n: number): Date { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }

// Zambian names
const firstNames = ['Chanda','Grace','Brian','Linda','Mutale','Thandiwe','Joseph','Mary','Kunda','Mwape','Bwalya','Chileshe','Nkole','Mumba','Tembo','Mwanza','Phiri','Banda','Mulenga','Chilufya','Kasongo','Zulu','Moyo','Sakala','Hamoonga','Daka','Nchimunya','Tionge','Luyando','Bupe','Mizinga','Natasha','Precious','Given','Emmanuel','Justine','Kelvin','Ruth','Esther','Agness','Miriam','Patricia','Catherine','Winnie','Doris','Faith','Gladys','Helen','Ireen','Jenipher'];
const lastNames = ['Mulenga','Mwanza','Tembo','Banda','Phiri','Mumba','Zulu','Moyo','Sakala','Nchimunya','Chanda','Chilufya','Kasongo','Daka','Mwape','Bwalya','Chileshe','Nkole','Hamoonga','Luyando','Tionge','Bupe','Mizinga','Chanda','Lungu','Mwale','Sichone','Sinyangwe','Mukuma','Kaoma','Kasonde','Mweetwa','Hamududu','Chibwe','Ngoma','Siame','Chibesa','Kaluba','Mukosa','Musonda'];
const streets = ['Cairo Road','Great East Road','Independence Avenue','Kalambo Road','Freedom Way','Church Road','Lumumba Road','Kafue Road','Mumbwa Road','Los Angeles Road','Nangwenya Road','Makishi Road','Chachacha Road','Kabulonga Road','Woodlands Road','Chilenje Road','Matero Road','Garden Road','Leopards Hill Road','Thabo Mbeki Road'];
const occupationsByArea: Record<string, {occ:string, employer:string|null, income:[number,number]}[]> = {
  'Lusaka CBD': [
    {occ:'Trader', employer:'Central Market Stall', income:[3000,7000]},
    {occ:'Shop Owner', employer:'Own Shop - CBD', income:[5000,12000]},
    {occ:'Trader', employer:'Kamwala Market', income:[2800,6500]},
    {occ:'Shop Owner', employer:'Own Boutique', income:[4000,9000]},
  ],
  'Kabulonga': [
    {occ:'Teacher', employer:'Kabulonga Boys Secondary', income:[6000,12000]},
    {occ:'Nurse', employer:'Levy Mwanawasa Hospital', income:[7000,14000]},
    {occ:'Accountant', employer:'KPMG Zambia', income:[12000,18000]},
    {occ:'Engineer', employer:'ZESCO', income:[10000,16000]},
    {occ:'Teacher', employer:'Baobab College', income:[5500,11000]},
  ],
  'Woodlands': [
    {occ:'Business Owner', employer:'Own Lodge', income:[8000,15000]},
    {occ:'Entrepreneur', employer:'Woodlands Mall Kiosk', income:[5000,11000]},
    {occ:'Salon Owner', employer:'Own Salon', income:[4000,8000]},
    {occ:'Restaurant Owner', employer:'Own Restaurant', income:[7000,13000]},
  ],
  'Chilenje': [
    {occ:'Taxi Driver', employer:'Own Taxi - Yango', income:[3000,6000]},
    {occ:'Mechanic', employer:'Chilenje Auto Works', income:[3500,7000]},
    {occ:'Driver', employer:'Ultimate Logistics', income:[3200,5800]},
    {occ:'Electrician', employer:'Self-employed', income:[4000,7500]},
  ],
  'Matero': [
    {occ:'Market Vendor', employer:'Matero Market', income:[2500,5000]},
    {occ:'Tailor', employer:'Own Tailoring Shop', income:[2800,5500]},
    {occ:'Vendor', employer:'Matero Market Stall', income:[2600,4800]},
    {occ:'Carpenter', employer:'Self-employed', income:[3000,6000]},
  ],
};
const relationships = ['Spouse','Parent','Sibling','Child','Friend','Cousin','Uncle','Aunt'];
const collateralVehicles = ['Toyota Vitz 2015 Blue','Toyota Wish Silver 2018','Nissan Note White 2017','Toyota Corolla 2019','Mazda Demio Blue','Honda Fit 2016','Toyota Hilux White'];
const collateralElectronics = ['Dell Laptop Inspiron 15','HP Laptop ProBook','Samsung 55\" TV','iPhone 14 Pro','MacBook Air M2','Sony Sound System','LG Fridge 200L','Microwave Samsung'];
const collateralAppliances = ['Samsung Double Door Fridge','LG Microwave','Hisense Chest Freezer','Bruhm Gas Stove','Defy Washing Machine'];
const collateralOther = ['Plot Title - Lusaka West','Farming Equipment Set','Salon Equipment','Restaurant Stock'];

// ── Products to ensure ───────────────────────────────────────────────
const DEMO_PRODUCTS = [
  { code:'DS', name:'Daily Small', description:'Small daily loan - 30 days', min_amount:500, max_amount:5000, interest_rate:20, interest_type:'flat', default_duration:30, duration_unit:'days', repayment_frequency:'daily', processing_fee_type:'none', penalty_rule_type:'daily', penalty_value:2, grace_period_days:1, default_after_days:7, allocation_order:'penalty,fee,interest,principal' },
  { code:'WS', name:'Weekly Standard', description:'Standard weekly loan - 12 weeks', min_amount:2000, max_amount:20000, interest_rate:25, interest_type:'flat', default_duration:12, duration_unit:'weeks', repayment_frequency:'weekly', processing_fee_type:'percent', processing_fee_value:3, penalty_rule_type:'percent_of_overdue', penalty_value:5, grace_period_days:3, default_after_days:14, allocation_order:'penalty,fee,interest,principal' },
  { code:'MP', name:'Monthly Plus', description:'Larger monthly loan - 6 months', min_amount:5000, max_amount:50000, interest_rate:30, interest_type:'flat', default_duration:6, duration_unit:'months', repayment_frequency:'monthly', processing_fee_type:'fixed', processing_fee_value:500, penalty_rule_type:'percent_of_overdue', penalty_value:5, grace_period_days:5, default_after_days:30, allocation_order:'penalty,fee,interest,principal' },
] as const;

// ── Main ──────────────────────────────────────────────────────────────
async function main(){
  console.log('Seeding demo data at', new Date().toISOString());
  const start = Date.now();

  // Check idempotency
  const { count: custCount } = await supabase.from('customers').select('id',{count:'exact',head:true});
  console.log(`Existing customers: ${custCount}`);
  if((custCount ?? 0) >= 40){
    console.log('Already have 40+ customers — skipping seed (idempotent).');
    return;
  }

  // Staff + branch
  console.log('Updating staff names...');
  const staffUpdates=[
    {email:'owner@bensonanson.loans', full_name:'Chanda Mulenga'},
    {email:'manager@bensonanson.loans', full_name:'Grace Mwanza'},
    {email:'officer@bensonanson.loans', full_name:'Brian Tembo'},
    {email:'cashier@bensonanson.loans', full_name:'Linda Banda'},
  ];
  for(const u of staffUpdates){
    const { error } = await supabase.from('profiles').update({full_name:u.full_name}).eq('email',u.email);
    if(error) console.warn(`Staff update ${u.email}: ${error.message}`);
    else console.log(`  ${u.email} -> ${u.full_name}`);
  }
  // Rename Head Office to Lusaka HQ if needed
  const { data: ho } = await supabase.from('branches').select('id,name').eq('code','HO').single();
  if(ho && ho.name !== 'Lusaka HQ'){
    await supabase.from('branches').update({name:'Lusaka HQ'}).eq('id',ho.id);
    console.log('Renamed Head Office -> Lusaka HQ');
  }
  const branchId = ho?.id || (await supabase.from('branches').select('id').eq('code','HO').single()).data?.id;
  const { data: officerProfile } = await supabase.from('profiles').select('id').eq('email','officer@bensonanson.loans').single();
  const { data: managerProfile } = await supabase.from('profiles').select('id').eq('email','manager@bensonanson.loans').single();
  const { data: cashierProfile } = await supabase.from('profiles').select('id').eq('email','cashier@bensonanson.loans').single();
  const officerId = officerProfile!.id;
  const managerId = managerProfile!.id;
  const cashierId = cashierProfile!.id;

  // Ensure demo products exist
  console.log('Ensuring demo loan products...');
  const productMap = new Map<string,string>(); // code -> id
  for(const p of DEMO_PRODUCTS){
    const { data: existing } = await supabase.from('loan_products').select('id').eq('code',p.code).maybeSingle();
    if(existing){
      productMap.set(p.code, existing.id);
      console.log(`  Product ${p.code} exists`);
    } else {
      const { data, error } = await supabase.from('loan_products').insert({
        name:p.name, code:p.code, description:p.description, is_active:true,
        min_amount:p.min_amount, max_amount:p.max_amount, interest_rate:p.interest_rate, interest_type:p.interest_type,
        default_duration:p.default_duration, duration_unit:p.duration_unit, repayment_frequency:p.repayment_frequency,
        processing_fee_type:p.processing_fee_type, processing_fee_value:(p as any).processing_fee_value ?? 0,
        penalty_rule_type:p.penalty_rule_type, penalty_value:p.penalty_value,
        grace_period_days:p.grace_period_days, default_after_days:p.default_after_days,
        allocation_order:p.allocation_order
      }).select('id').single();
      if(error) throw new Error(`Product ${p.code} insert failed: ${error.message}`);
      productMap.set(p.code, data.id);
      console.log(`  Created product ${p.code}`);
    }
  }
  // Also map existing products for completeness
  const { data: existingProducts } = await supabase.from('loan_products').select('id,code').in('code',['PL','BL','SA']);
  for(const ep of existingProducts ?? []){ if(!productMap.has(ep.code)) productMap.set(ep.code, ep.id); }

  // ── Customers 40 ────────────────────────────────────────────────────
  console.log('Generating 40 customers...');
  const areaDist: Array<[string,number]> = [['Lusaka CBD',10],['Kabulonga',8],['Woodlands',8],['Chilenje',8],['Matero',6]];
  const customers: any[] = [];
  const customerIds: string[] = [];
  let custIdx=0;
  const statuses = [...Array(35).fill('active'), ...Array(3).fill('active'), ...Array(2).fill('inactive')];
  shuffle(statuses);
  for(const [area, count] of areaDist){
    for(let i=0;i<count;i++){
      const idx = custIdx++;
      const first = choice(firstNames);
      const last = choice(lastNames);
      const occInfo = choice(occupationsByArea[area]!);
      const age = rand(24,55);
      const income = rand(occInfo.income[0], occInfo.income[1]);
      const status = statuses[idx];
      const id = randomUUID();
      customerIds.push(id);
      customers.push({
        id, first_name:first, last_name:last, nrc_number:nrc(100000+idx), phone:phone(idx), alt_phone:altPhone(idx),
        email:`${first.toLowerCase()}.${last.toLowerCase()}${idx}@example.com`, address:`${rand(1,200)} ${choice(streets)}, ${area}, Lusaka`, city:'Lusaka', province:'Lusaka',
        occupation:occInfo.occ, employer_name:occInfo.employer, next_of_kin_name:`${choice(firstNames)} ${choice(lastNames)}`, next_of_kin_phone:phone(idx+100), next_of_kin_relationship:choice(relationships),
        photo_url:null, status, branch_id:branchId, created_by:officerId, created_at: new Date(Date.now() - rand(10,180)*86400000).toISOString(),
      });
    }
  }
  // Batch insert customers 20 at a time
  for(let i=0;i<customers.length;i+=20){
    const batch = customers.slice(i,i+20);
    const { error } = await supabase.from('customers').insert(batch);
    if(error) throw new Error(`Customers batch ${i/20}: ${error.message}`);
    console.log(`  Customers batch ${i/20 +1}: ${batch.length} inserted`);
  }

  // ── Loans 45 ────────────────────────────────────────────────────────
  console.log('Generating 45 loans...');
  const today = new Date();
  const startDate = new Date(); startDate.setDate(today.getDate() - 180); // ~6 months ago

  // Health plan: 28 performing, 6 at_risk, 5 overdue, 4 defaulted, 2 fully_paid =45
  const healthPlan: Array<{health:string, status:string, count:number}> = [
    {health:'performing', status:'performing', count:28},
    {health:'at_risk', status:'at_risk', count:6},
    {health:'overdue', status:'overdue', count:5},
    {health:'defaulted', status:'defaulted', count:4},
    {health:'performing', status:'fully_paid', count:2},
  ];
  const healthSeq: Array<{health:string,status:string}>=[];
  for(const h of healthPlan) for(let i=0;i<h.count;i++) healthSeq.push({health:h.health, status:h.status});
  shuffle(healthSeq);

  // Product distribution: 20 DS, 15 WS, 10 MP
  const loanProductsSeq: string[] = [...Array(20).fill('DS'), ...Array(15).fill('WS'), ...Array(10).fill('MP')];
  shuffle(loanProductsSeq);

  // Shuffle customers for loan assignment (allow repeats? 40 customers, 45 loans => 5 customers get 2 loans)
  const loanCustomers = [...customerIds];
  while(loanCustomers.length < 45) loanCustomers.push(choice(customerIds));
  shuffle(loanCustomers);

  const loans: any[] = [];
  const loanIds: string[] = [];
  const loanCustomerMap = new Map<string,string>(); // loanId -> customerId

  for(let i=0;i<45;i++){
    const loanId = randomUUID();
    loanIds.push(loanId);
    const customerId = loanCustomers[i];
    const prodCode = loanProductsSeq[i];
    const productId = productMap.get(prodCode)!;
    const {health, status} = healthSeq[i];
    const prodDef = DEMO_PRODUCTS.find(p=>p.code===prodCode)!;
    // Principal within range
    const principal = rand(prodDef.min_amount, Math.min(prodDef.max_amount, prodDef.min_amount + 8000) ); // keep reasonable
    const principalRounded = Math.round(principal/100)*100; // round to 100
    const interestRate = prodDef.interest_rate;
    const totalInterest = Math.round(principalRounded * interestRate /100 *100)/100;
    const totalFees = prodDef.processing_fee_type==='fixed' ? Number(prodDef.processing_fee_value) : prodDef.processing_fee_type==='percent' ? Math.round(principalRounded*Number(prodDef.processing_fee_value)/100*100)/100 : 0;
    const totalRepayable = Math.round((principalRounded + totalInterest + totalFees)*100)/100;
    // Disbursement date spread: performing more recent, defaulted oldest
    let disbursed: Date;
    if(status==='fully_paid') disbursed = addDays(startDate, rand(10,40));
    else if(health==='defaulted') disbursed = addDays(startDate, rand(5,35));
    else if(health==='overdue') disbursed = addDays(startDate, rand(70,110));
    else if(health==='at_risk') disbursed = addDays(startDate, rand(110,145));
    else disbursed = addDays(startDate, rand(130,175)); // performing recent

    const disbursementDate = fmtDate(disbursed);
    let firstDue: Date, maturity: Date, duration: number;
    if(prodCode==='DS'){ duration=30; firstDue=addDays(disbursed,1); maturity=addDays(disbursed,30); }
    else if(prodCode==='WS'){ duration=12; firstDue=addWeeks(disbursed,1); maturity=addWeeks(disbursed,12); }
    else { duration=6; firstDue=addMonths(disbursed,1); maturity=addMonths(disbursed,6); }

    // Outstanding / paid based on health
    let amountPaid: number, outstanding: number, daysOverdue: number, arrears: number, unallocated=0;
    if(status==='fully_paid'){
      amountPaid = totalRepayable; outstanding=0; daysOverdue=0; arrears=0;
    } else if(health==='defaulted'){
      amountPaid = Math.round(totalRepayable*0.3*100)/100; outstanding = Math.round((totalRepayable-amountPaid)*100)/100; daysOverdue=rand(45,90); arrears= Math.round(outstanding*0.8*100)/100;
    } else if(health==='overdue'){
      amountPaid = Math.round(totalRepayable*0.6*100)/100; outstanding = Math.round((totalRepayable-amountPaid)*100)/100; daysOverdue=rand(10,25); arrears= Math.round(outstanding*0.5*100)/100;
    } else if(health==='at_risk'){
      amountPaid = Math.round(totalRepayable*0.9*100)/100; outstanding = Math.round((totalRepayable-amountPaid)*100)/100; daysOverdue=rand(1,3); arrears= outstanding;
    } else { // performing
      // For performing, paid up to today: if maturity past, fully paid? But performing should have no arrears, so paid = expected due up to today
      // Simplify: paid 70-100% but no overdue
      const pct = rand(70,100)/100;
      amountPaid = Math.round(totalRepayable*pct*100)/100;
      if(amountPaid > totalRepayable) amountPaid=totalRepayable;
      outstanding = Math.round((totalRepayable-amountPaid)*100)/100;
      daysOverdue=0; arrears=0;
    }
    // One overpayment case: first performing loan gets unallocated_credit
    if(i===0 && health==='performing'){
      unallocated = 500;
      amountPaid = Math.round((amountPaid+500)*100)/100;
      // keep totalRepayable same, so outstanding reduced but unallocated added
      outstanding = Math.max(0, Math.round((totalRepayable - (amountPaid-500))*100)/100);
    }

    loans.push({
      id:loanId, loan_number:`LN${String(1001+i).padStart(5,'0')}`, customer_id:customerId, loan_product_id:productId, branch_id:branchId, officer_id:officerId,
      principal_amount:principalRounded, interest_rate:interestRate, interest_type:prodDef.interest_type,
      total_interest:totalInterest, total_fees:totalFees, total_repayable:totalRepayable, amount_paid:amountPaid, outstanding_balance:outstanding, unallocated_credit:unallocated,
      duration, duration_unit:prodDef.duration_unit, repayment_frequency:prodDef.repayment_frequency,
      disbursement_date:disbursementDate, first_due_date:fmtDate(firstDue), maturity_date:fmtDate(maturity),
      status, health, days_overdue:daysOverdue, arrears_amount:arrears, disbursement_method:choice(['cash','bank_transfer','mobile_money','cash','cash']), disbursed_by:managerId,
      created_at: fmtDate(disbursed) + 'T10:00:00Z',
    });
    loanCustomerMap.set(loanId, customerId);
  }

  for(let i=0;i<loans.length;i+=20){
    const batch = loans.slice(i,i+20);
    const { error } = await supabase.from('loans').insert(batch);
    if(error) throw new Error(`Loans batch ${i/20}: ${error.message} - ${JSON.stringify(error)}`);
    console.log(`  Loans batch ${i/20 +1}: ${batch.length} inserted`);
  }

  // ── Loan Schedule ───────────────────────────────────────────────────
  console.log('Generating loan schedules...');
  const schedules: any[] = [];
  for(const loan of loans){
    const prodCode = loanProductsSeq[loans.indexOf(loan)];
    const prodDef = DEMO_PRODUCTS.find(p=>p.code===prodCode)!;
    let numInstalments: number;
    if(prodCode==='DS') numInstalments=30;
    else if(prodCode==='WS') numInstalments=12;
    else numInstalments=6;
    const perInstalment = Math.round(loan.total_repayable/numInstalments*100)/100;
    let remaining = loan.total_repayable;
    const disbursed = new Date(loan.disbursement_date);
    for(let n=1;n<=numInstalments;n++){
      let due: Date;
      if(prodCode==='DS') due=addDays(disbursed,n);
      else if(prodCode==='WS') due=addWeeks(disbursed,n);
      else due=addMonths(disbursed,n);
      const isLast = n===numInstalments;
      const dueAmount = isLast ? Math.round(remaining*100)/100 : perInstalment;
      const principalDue = Math.round((loan.principal_amount/numInstalments)*100)/100;
      const interestDue = Math.round((loan.total_interest/numInstalments)*100)/100;
      const feeDue = 0;
      let status: string;
      const dueStr = fmtDate(due);
      const todayStr = fmtDate(today);
      const paidRatio = loan.amount_paid/loan.total_repayable;
      // Determine if this instalment should be paid based on loan health and due date
      const isDue = due <= today;
      let paidAmount=0;
      if(loan.status==='fully_paid'){
        paidAmount=dueAmount; status='paid';
      } else if(!isDue){
        status='upcoming'; paidAmount=0;
      } else {
        // For due instalments, decide payment based on health
        if(loan.health==='performing'){
          paidAmount=dueAmount; status='paid';
        } else if(loan.health==='at_risk'){
          paidAmount = Math.random()<0.9 ? dueAmount : (Math.random()<0.5? Math.round(dueAmount*0.5*100)/100 : 0);
          status = paidAmount===0?'overdue':paidAmount<dueAmount?'part_paid':'paid';
        } else if(loan.health==='overdue'){
          paidAmount = Math.random()<0.6 ? dueAmount : 0;
          status = paidAmount===0?'overdue': paidAmount<dueAmount?'part_paid':'paid';
        } else { // defaulted
          paidAmount = Math.random()<0.3 ? dueAmount : 0;
          status = paidAmount===0?'overdue':'part_paid';
          if(paidAmount===dueAmount) status='paid';
        }
      }
      const rem = Math.round((dueAmount - paidAmount)*100)/100;
      remaining = Math.round((remaining - dueAmount)*100)/100;
      schedules.push({
        id:randomUUID(), loan_id:loan.id, instalment_number:n, due_date:dueStr,
        due_amount:dueAmount, principal_due: isLast? Math.round((loan.principal_amount - (numInstalments-1)*principalDue)*100)/100 : principalDue,
        interest_due: isLast? Math.round((loan.total_interest - (numInstalments-1)*interestDue)*100)/100 : interestDue,
        fee_due:feeDue, penalty_due:0, paid_amount:paidAmount, remaining: rem, status, paid_at: paidAmount>0? fmtDate(addDays(due, rand(0,2)))+'T10:00:00Z': null,
      });
    }
    if(loans.indexOf(loan) %10===9) console.log(`  Schedules for ${loans.indexOf(loan)+1} loans generated`);
  }
  for(let i=0;i<schedules.length;i+=100){
    const batch = schedules.slice(i,i+100);
    const { error } = await supabase.from('loan_schedule').insert(batch);
    if(error) throw new Error(`Schedule batch ${i/100}: ${error.message}`);
    console.log(`  Schedule batch ${i/100 +1}: ${batch.length} inserted`);
  }
  console.log(`  Total schedules: ${schedules.length}`);

  // ── Payments ────────────────────────────────────────────────────────
  console.log('Generating payments (~180)...');
  const payments: any[] = [];
  let paymentSeq=1;
  const methods = ['cash','cash','cash','cash','cash','cash','airtel_money','airtel_money','mtn_mobile_money','bank_transfer']; // 60/20/15/5 approx
  // One penalty payment and one overpayment already handled via loan 0 unallocated; create penalty record later
  for(const loan of loans){
    // Number of payments = number of paid instalments for this loan, but consolidate into fewer payments (e.g., 3-5 per loan average 4 => 180)
    // For simplicity, generate 3-5 payments per loan, staggered
    const paidInstalments = schedules.filter(s=>s.loan_id===loan.id && s.paid_amount>0).length;
    if(paidInstalments===0) continue;
    const numPayments = Math.max(1, Math.min(5, Math.ceil(paidInstalments/3)));
    const totalPaidForLoan = schedules.filter(s=>s.loan_id===loan.id).reduce((sum,s)=>sum+s.paid_amount,0);
    // Avoid zero
    if(totalPaidForLoan===0) continue;
    const perPayment = Math.round(totalPaidForLoan/numPayments*100)/100;
    let remainingPaid = totalPaidForLoan;
    for(let p=0;p<numPayments;p++){
      const isLast = p===numPayments-1;
      const amt = isLast ? Math.round(remainingPaid*100)/100 : perPayment;
      remainingPaid = Math.round((remainingPaid - amt)*100)/100;
      const paidAt = addDays(new Date(loan.disbursement_date), 7 + p*10 + rand(0,5));
      if(paidAt > today) continue;
      payments.push({
        id:randomUUID(), payment_number:`PY${String(1000+paymentSeq++).padStart(6,'0')}`, loan_id:loan.id, customer_id:loan.customer_id,
        amount:amt, payment_method:choice(methods), reference_number: Math.random()<0.3? `REF${rand(100000,999999)}`: null,
        paid_at: paidAt.toISOString(), recorded_by:cashierId, status:'verified', notes: p===0? 'Initial repayment': null,
      });
    }
    if(loans.indexOf(loan) %10===9) console.log(`  Payments for ${loans.indexOf(loan)+1} loans`);
  }
  // Ensure at least 180 payments: if less, duplicate some
  while(payments.length < 170){
    const loan = choice(loans);
    const amt = rand(500,2000);
    payments.push({
      id:randomUUID(), payment_number:`PY${String(1000+paymentSeq++).padStart(6,'0')}`, loan_id:loan.id, customer_id:loan.customer_id,
      amount:amt, payment_method:choice(methods), paid_at: addDays(new Date(loan.disbursement_date), rand(5,60)).toISOString(), recorded_by:cashierId, status:'verified',
    });
  }
  for(let i=0;i<payments.length;i+=50){
    const batch = payments.slice(i,i+50);
    const { error } = await supabase.from('payments').insert(batch);
    if(error) throw new Error(`Payments batch ${i/50}: ${error.message}`);
    console.log(`  Payments batch ${i/50 +1}: ${batch.length} inserted`);
  }
  console.log(`  Total payments: ${payments.length}`);

  // ── Collateral ──────────────────────────────────────────────────────
  console.log('Generating collateral...');
  const collaterals: any[] = [];
  const collateralMedia: any[] = [];
  const collateralTypes = [...Array(12).fill('vehicle'), ...Array(18).fill('electronics'), ...Array(10).fill('appliances'), ...Array(5).fill('other')];
  shuffle(collateralTypes);
  for(let i=0;i<loans.length;i++){
    const loan = loans[i];
    const type = collateralTypes[i];
    let desc: string, estVal: number, serial: string, makeModel: string|null=null;
    if(type==='vehicle'){
      const v = choice(collateralVehicles);
      desc = v + ' - pledged for loan ' + loan.loan_number;
      estVal = rand(15000,80000);
      serial = `CHASSIS${String(rand(1000000,9999999))}`;
      makeModel = v;
    } else if(type==='electronics'){
      const e = choice(collateralElectronics);
      desc = e + ' - ' + loan.loan_number;
      estVal = rand(3000,25000);
      serial = `SN${String(rand(10000000,99999999))}`;
      makeModel = e;
    } else if(type==='appliances'){
      const a = choice(collateralAppliances);
      desc = a + ' - loan ' + loan.loan_number;
      estVal = rand(4000,15000);
      serial = `AP${String(rand(1000000,9999999))}`;
      makeModel = a;
    } else {
      const o = choice(collateralOther);
      desc = o + ' - ' + loan.loan_number;
      estVal = rand(5000,20000);
      serial = `OTH${String(rand(100000,999999))}`;
    }
    const collId = randomUUID();
    const status = loan.status==='fully_paid' ? 'released' : 'pledged';
    collaterals.push({
      id:collId, customer_id:loan.customer_id, collateral_type:type, description:desc, make_model:makeModel,
      serial_number:serial, estimated_value:estVal, location:choice(['Lusaka','Kabulonga','Woodlands','Chilenje','Matero']),
      status, created_by:officerId,
    });
    // Media: 1-2 photos placeholder
    const numMedia = rand(1,2);
    for(let m=0;m<numMedia;m++){
      collateralMedia.push({
        id:randomUUID(), collateral_id:collId, media_type:'photo',
        file_name:`photo_${m+1}.webp`, file_path:`/marketing/collateral/${type==='vehicle'?'car.jpeg':type==='electronics'?'phone.webp':type==='appliances'?'fridge.webp':'other.webp'}`,
        file_size: rand(50000,200000), is_primary: m===0, uploaded_by:officerId,
      });
    }
    if(i%10===9) console.log(`  Collateral for ${i+1} loans`);
  }
  for(let i=0;i<collaterals.length;i+=20){
    const batch = collaterals.slice(i,i+20);
    const { error } = await supabase.from('collateral').insert(batch);
    if(error) throw new Error(`Collateral batch ${i/20}: ${error.message}`);
    console.log(`  Collateral batch ${i/20 +1}: ${batch.length}`);
  }
  for(let i=0;i<collateralMedia.length;i+=50){
    const batch = collateralMedia.slice(i,i+50);
    const { error } = await supabase.from('collateral_media').insert(batch);
    if(error) throw new Error(`Collateral media batch ${i/50}: ${error.message}`);
    console.log(`  Collateral media batch ${i/50 +1}: ${batch.length}`);
  }

  // ── Loan officer notes ──────────────────────────────────────────────
  console.log('Generating officer notes (~200)...');
  const notes: any[] = [];
  const noteTypes = ['customer_contacted','promise_to_pay','customer_visited','payment_delayed','collateral_inspected','general'];
  const noteContents: Record<string,string[]> = {
    customer_contacted: ['Called customer, confirmed next payment date','Customer contacted via phone, will pay tomorrow','Spoke to customer, requested extension'],
    promise_to_pay: ['Customer promised to pay K1500 on Friday','Promise to pay next Monday','Will clear arrears by month end'],
    customer_visited: ['Visited customer at home, found business operating','Site visit completed, collateral verified','Customer visited office to discuss repayment'],
    payment_delayed: ['Payment delayed due to illness','Customer cited cash flow issues','Delayed - awaiting salary'],
    collateral_inspected: ['Collateral inspected, in good condition','Vehicle checked, mileage verified','Electronics tested, working fine'],
    general: ['Follow-up required next week','Customer is cooperative','Recommend monitoring closely'],
  };
  for(const loan of loans){
    const n = rand(3,5);
    for(let j=0;j<n;j++){
      const type = choice(noteTypes);
      const content = choice(noteContents[type]!);
      notes.push({
        id:randomUUID(), loan_id:loan.id, officer_id:officerId, note_type:type, content: `${content} - ${loan.loan_number}`,
        follow_up_date: j===n-1? fmtDate(addDays(today, rand(1,7))): null,
        created_at: addDays(new Date(loan.disbursement_date), rand(5,60)).toISOString(),
      });
    }
  }
  for(let i=0;i<notes.length;i+=50){
    const batch = notes.slice(i,i+50);
    const { error } = await supabase.from('loan_officer_notes').insert(batch);
    if(error) throw new Error(`Notes batch ${i/50}: ${error.message}`);
    console.log(`  Notes batch ${i/50 +1}: ${batch.length}`);
  }
  console.log(`  Total notes: ${notes.length}`);

  // ── Penalties ───────────────────────────────────────────────────────
  console.log('Generating penalties for overdue loans...');
  const penalties: any[] = [];
  for(const loan of loans){
    if(loan.health==='overdue' || loan.health==='defaulted'){
      penalties.push({
        id:randomUUID(), loan_id:loan.id, penalty_type:'percent_of_overdue', amount: Math.round(loan.arrears_amount * 0.05 *100)/100, base_amount: loan.arrears_amount, calculation_date: fmtDate(today), description:`5% penalty on K${loan.arrears_amount} overdue`, status:'active', paid_amount: loan.health==='overdue' && Math.random()<0.5 ? Math.round(loan.arrears_amount*0.05*100)/100 : 0, assessed_by:managerId,
      });
    }
  }
  if(penalties.length>0){
    const { error } = await supabase.from('penalties').insert(penalties);
    if(error) console.warn('Penalties insert:', error.message);
    else console.log(`  Penalties: ${penalties.length}`);
  }

  // ── Expenses 36 (6*6) ───────────────────────────────────────────────
  console.log('Generating expenses...');
  const expenses: any[] = [];
  const expenseDefs: Array<[string,number,string]> = [
    ['rent',3500,'Office rent - Lusaka HQ'],
    ['salaries',12000,'Staff salaries'],
    ['transport',800,'Transport & fuel'],
    ['airtime',400,'Airtime & internet'],
    ['utilities',600,'Utilities - ZESCO & water'],
    ['office',500,'Office supplies'],
  ];
  for(let m=0;m<6;m++){
    const d = new Date(); d.setMonth(d.getMonth()-m); d.setDate(15);
    const dateStr = fmtDate(d);
    for(const [cat, amt, desc] of expenseDefs){
      expenses.push({ id:randomUUID(), category:cat, description:`${desc} - ${d.toLocaleString('en-ZM',{month:'long',year:'numeric'})}`, amount:amt, expense_date:dateStr, branch_id:branchId, recorded_by:cashierId });
    }
  }
  for(let i=0;i<expenses.length;i+=20){
    const batch = expenses.slice(i,i+20);
    const { error } = await supabase.from('expenses').insert(batch);
    if(error) throw new Error(`Expenses batch ${i/20}: ${error.message}`);
    console.log(`  Expenses batch ${i/20 +1}: ${batch.length}`);
  }

  // ── Income records 3 ────────────────────────────────────────────────
  console.log('Generating income records...');
  const incomes = [
    { category:'processing_fees', description:'Processing fees - October', amount:1200, income_date: fmtDate(addDays(today,-10)), loan_id:loans[0].id, branch_id:branchId, recorded_by:cashierId },
    { category:'other', description:'Other charges - document fees', amount:850, income_date: fmtDate(addDays(today,-20)), branch_id:branchId, recorded_by:cashierId },
    { category:'other', description:'Service charges', amount:600, income_date: fmtDate(addDays(today,-40)), branch_id:branchId, recorded_by:cashierId },
  ];
  const { error: incErr } = await supabase.from('income_records').insert(incomes);
  if(incErr) console.warn('Income insert:', incErr.message);
  else console.log('  Income: 3');

  const elapsed = ((Date.now()-start)/1000).toFixed(1);
  console.log(`\nSeeding completed in ${elapsed}s`);
  // Final counts
  const tables = ['customers','loans','payments','collateral','loan_schedule','loan_officer_notes','expenses','income_records','penalties'];
  for(const t of tables){
    const { count } = await supabase.from(t).select('id',{count:'exact',head:true});
    console.log(`  ${t}: ${count}`);
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });
