import { getDb } from '../../src/config/db.js';
import { AIEngineService } from '../../src/services/aiEngine.service.js';
import { MP, Work, Payment, Asset, User } from '../../src/types/index.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// State-to-district mappings for works distribution
const STATE_DISTRICTS: Record<string, string[]> = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Kurnool'],
  'Arunachal Pradesh': ['Itanagar', 'Tawang', 'Pasighat', 'Ziro'],
  'Assam': ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat', 'Tezpur'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg'],
  'Goa': ['North Goa', 'South Goa', 'Panaji', 'Margao'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Karnal'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Mandi', 'Solan', 'Kullu'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar'],
  'Karnataka': ['Bengaluru Urban', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain'],
  'Maharashtra': ['Mumbai City', 'Mumbai Suburban', 'Pune', 'Nagpur', 'Nashik', 'Thane'],
  'Manipur': ['Imphal West', 'Imphal East', 'Churachandpur', 'Thoubal'],
  'Meghalaya': ['East Khasi Hills (Shillong)', 'West Garo Hills (Tura)', 'Jaintia Hills'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai', 'Koladib'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Sambalpur', 'Puri'],
  'Punjab': ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Bathinda'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner'],
  'Sikkim': ['East Sikkim (Gangtok)', 'West Sikkim', 'South Sikkim', 'North Sikkim'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
  'Telangana': ['Hyderabad', 'Ranga Reddy', 'Medchal-Malkajgiri', 'Warangal', 'Nizamabad'],
  'Tripura': ['West Tripura (Agartala)', 'Gomati', 'South Tripura', 'Dhalai'],
  'Uttar Pradesh': ['Lucknow', 'Varanasi', 'Kanpur', 'Agra', 'Prayagraj', 'Noida', 'Gorakhpur'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Nainital', 'Rishikesh', 'Almora'],
  'West Bengal': ['Kolkata', 'Howrah', 'Siliguri', 'Durgapur', 'Asansol', 'Darjeeling'],
  'Delhi': ['New Delhi', 'Central Delhi', 'South Delhi', 'North Delhi', 'East Delhi'],
  'Jammu & Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur'],
  'Ladakh': ['Leh', 'Kargil'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
  'Chandigarh': ['Chandigarh Urban', 'Chandigarh Rural'],
  'Andaman & Nicobar': ['Port Blair (South Andaman)', 'North & Middle Andaman', 'Nicobar'],
  'Dadra & Nagar Haveli and Daman & Diu': ['Daman', 'Diu', 'Silvassa'],
  'Lakshadweep': ['Kavaratti', 'Agatti', 'Minicoy']
};

// Deterministic state coordinates for geo-tagging assets
const STATE_COORDS: Record<string, { lat: number; lng: number }> = {
  'Andhra Pradesh': { lat: 15.9129, lng: 79.7400 },
  'Arunachal Pradesh': { lat: 28.2180, lng: 94.7278 },
  'Assam': { lat: 26.2006, lng: 92.9376 },
  'Bihar': { lat: 25.0961, lng: 85.3131 },
  'Chhattisgarh': { lat: 21.2787, lng: 81.8661 },
  'Goa': { lat: 15.2993, lng: 74.1240 },
  'Gujarat': { lat: 22.2587, lng: 71.1924 },
  'Haryana': { lat: 29.0588, lng: 76.0856 },
  'Himachal Pradesh': { lat: 31.1048, lng: 77.1734 },
  'Jharkhand': { lat: 23.6102, lng: 85.2799 },
  'Karnataka': { lat: 15.3173, lng: 75.7139 },
  'Kerala': { lat: 10.8505, lng: 76.2711 },
  'Madhya Pradesh': { lat: 22.9734, lng: 78.6569 },
  'Maharashtra': { lat: 19.7515, lng: 75.7139 },
  'Manipur': { lat: 24.6637, lng: 93.9063 },
  'Meghalaya': { lat: 25.4670, lng: 91.3662 },
  'Mizoram': { lat: 23.1645, lng: 92.9376 },
  'Nagaland': { lat: 26.1584, lng: 94.5624 },
  'Odisha': { lat: 20.9517, lng: 85.0985 },
  'Punjab': { lat: 31.1471, lng: 75.3412 },
  'Rajasthan': { lat: 27.0238, lng: 74.2179 },
  'Sikkim': { lat: 27.5330, lng: 88.5122 },
  'Tamil Nadu': { lat: 11.1271, lng: 78.6569 },
  'Telangana': { lat: 18.1124, lng: 79.0193 },
  'Tripura': { lat: 23.9408, lng: 91.9882 },
  'Uttar Pradesh': { lat: 26.8467, lng: 80.9462 },
  'Uttarakhand': { lat: 30.0668, lng: 79.0193 },
  'West Bengal': { lat: 22.9868, lng: 87.8550 },
  'Delhi': { lat: 28.7041, lng: 77.1025 },
  'Jammu & Kashmir': { lat: 33.7782, lng: 76.5762 },
  'Ladakh': { lat: 34.1526, lng: 77.5771 },
  'Puducherry': { lat: 11.9416, lng: 79.8083 },
  'Chandigarh': { lat: 30.7333, lng: 76.7794 },
  'Andaman & Nicobar': { lat: 11.7401, lng: 92.6586 },
  'Dadra & Nagar Haveli and Daman & Diu': { lat: 20.1809, lng: 73.0169 },
  'Lakshadweep': { lat: 10.5667, lng: 72.6417 }
};

const CONTRACTORS = [
  'National Infra Projects Ltd',
  'Apex Civil Infrastructure Corp',
  'Bharat Vikas Construction Co',
  'Sai Engineering & Building Works',
  'Pragati Construction Enterprises',
  'Hindustan Infra Developers Ltd',
  'Nav Nirman Builders & Contractors',
  'Shri Balaji Engineering Works',
  'Panchayat Infrastructure Works',
  'Vanguard Civil & Electricals Ltd'
];

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

function cleanSlug(str: string): string {
  return str.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_');
}

// Deterministic coordinate offset based on string id (avoids Math.random on render)
function getDeterministicOffset(id: string): { dLat: number; dLng: number } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  }
  const dLat = ((hash % 100) / 100 - 0.5) * 0.4;
  const dLng = (((hash >> 4) % 100) / 100 - 0.5) * 0.4;
  return { dLat, dLng };
}

async function seed() {
  console.log('🌱 Starting MPALS database seeding pipeline...');
  const db = await getDb();

  // Load raw dataset
  const seedFile = path.resolve(__dirname, './seed-data.json');
  if (!fs.existsSync(seedFile)) {
    throw new Error(`Seed data file not found at ${seedFile}`);
  }

  const rawData = JSON.parse(fs.readFileSync(seedFile, 'utf-8'));
  const rsCurrent: any[] = rawData.rs_current || [];
  const rsFull: any[] = rawData.rs_full || [];
  const rawWorks: any[] = rawData.synthetic_works || [];

  console.log(` Loaded ${rsCurrent.length} Rajya Sabha MPs, ${rsFull.length} Lok Sabha MPs, and ${rawWorks.length} Synthetic Works.`);

  // 1. Clear existing data in correct FK order
  console.log('🧹 Clearing existing demo data...');
  await db.exec('DELETE FROM alerts;');
  await db.exec('DELETE FROM assets;');
  await db.exec('DELETE FROM payments;');
  await db.exec('DELETE FROM works;');
  await db.exec('DELETE FROM users;');
  await db.exec('DELETE FROM mps;');
  await db.exec('DELETE FROM districts;');

  // 2. Seed Districts
  console.log('📍 Seeding district master data...');
  const districtMap: Record<string, string[]> = {};

  for (const [state, dNames] of Object.entries(STATE_DISTRICTS)) {
    districtMap[state] = [];
    for (const dName of dNames) {
      const dId = `DST_${cleanSlug(state)}_${cleanSlug(dName)}`.slice(0, 50);
      districtMap[state].push(dId);
      await db.query(
        `INSERT INTO districts (id, name, state) VALUES ($1, $2, $3);`,
        [dId, dName, state]
      );
    }
  }

  // Ensure any other state in data has at least one default district
  const allStates = new Set<string>();
  [...rsCurrent, ...rsFull].forEach(mp => allStates.add(mp.state));
  for (const st of allStates) {
    if (!districtMap[st] || districtMap[st].length === 0) {
      const dId = `DST_${cleanSlug(st)}_HQ`.slice(0, 50);
      districtMap[st] = [dId];
      await db.query(
        `INSERT INTO districts (id, name, state) VALUES ($1, $2, $3);`,
        [dId, `${st} State Nodal`, st]
      );
    }
  }

  // 3. Prepare and score all MPs with proper LS vs RS classification
  console.log('👥 Preparing and scoring MPs (Rajya Sabha + Lok Sabha)...');
  
  // RS Members
  const rsMPs: MP[] = rsCurrent.map(r => ({
    id: r.id,
    name: r.mp_name,
    mp_name_raw: r.mp_name_raw,
    state: r.state,
    district: null, // RS MPs represent state-wide
    constituency_type: 'State-Wide (Rajya Sabha)',
    term_start: r.term_start || null,
    term_end: r.term_end || null,
    allocated_amount: Number(r.allocated_amount) || 0,
    house: 'RS',
    source: 'Rajya Sabha',
    sr_no: r.sr_no || null,
    risk_score: 0,
    risk_level: 'low'
  }));

  // LS Members
  const lsMPs: MP[] = rsFull.map(r => ({
    id: r.id,
    name: r.mp_name,
    mp_name_raw: r.mp_name_raw,
    state: r.state,
    district: districtMap[r.state] ? districtMap[r.state][0] : null,
    constituency_type: r.type ? `${r.type} (Lok Sabha)` : 'Elected (Lok Sabha)',
    term_start: r.term_start || null,
    term_end: r.term_end || null,
    allocated_amount: Number(r.allocated_amount) || 0,
    house: 'LS',
    source: 'Lok Sabha',
    sr_no: r.sr_no || null,
    risk_score: 0,
    risk_level: 'low'
  }));

  const rawAllMPs: MP[] = [...rsMPs, ...lsMPs];
  const scoredMPs = AIEngineService.computeRiskScores(rawAllMPs);

  console.log(` Saving ${scoredMPs.length} MPs to database (${rsMPs.length} RS, ${lsMPs.length} LS)...`);
  for (const mp of scoredMPs) {
    await db.query(
      `INSERT INTO mps (
        id, name, mp_name_raw, state, district, constituency_type,
        term_start, term_end, allocated_amount, house, source, sr_no,
        risk_score, risk_level, z_score, peer_deviation, dup_flag,
        term_flag, reasons
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19);`,
      [
        mp.id,
        mp.name,
        mp.mp_name_raw || null,
        mp.state,
        mp.district || null,
        mp.constituency_type,
        mp.term_start || null,
        mp.term_end || null,
        mp.allocated_amount,
        mp.house,
        mp.source || null,
        mp.sr_no || null,
        mp.risk_score,
        mp.risk_level,
        mp.z_score || null,
        mp.peer_deviation || null,
        mp.dup_flag || 'unique',
        mp.term_flag || 'valid',
        JSON.stringify(mp.reasons || [])
      ]
    );
  }

  // 4. Seed Works
  console.log('🏗️ Seeding works with cost estimate, contractors, and dates...');
  const worksList: Work[] = [];

  for (let idx = 0; idx < rawWorks.length; idx++) {
    const w = rawWorks[idx];
    const sAmt = Number(w.sanctioned_amount) || 0;
    const exp = Number(w.expenditure) || 0;
    const sYear = Number(w.start_year) || 2022;
    const sMonth = Number(w.start_month) || 1;
    const startDate = `${sYear}-${String(sMonth).padStart(2, '0')}-01`;
    const expCompDate = `${sYear + 1}-${String(sMonth).padStart(2, '0')}-28`;
    const actualCompDate = w.status === 'Completed' ? `${sYear + 1}-${String(Math.min(12, sMonth + 4)).padStart(2, '0')}-15` : null;

    // Pick district in state deterministically
    const dList = districtMap[w.state] || [w.state];
    const districtId = dList[idx % dList.length];

    const workRecord: Work = {
      id: w.work_id,
      mp_id: w.mp_id,
      district_id: districtId,
      state: w.state,
      mp_name: w.mp_name,
      work_type: w.work_type,
      work_name: w.work_name,
      sanctioned_amount: sAmt,
      cost_estimate: Number(w.cost_estimate) || sAmt,
      expenditure: exp,
      status: w.status,
      start_year: sYear,
      start_month: sMonth,
      start_date: startDate,
      expected_completion_date: expCompDate,
      actual_completion_date: actualCompDate,
      completion_pct: Number(w.completion_pct) || 0,
      contractor_name: CONTRACTORS[idx % CONTRACTORS.length],
      anomaly_type: w.anomaly_type || null
    };

    worksList.push(workRecord);

    await db.query(
      `INSERT INTO works (
        id, mp_id, district_id, state, mp_name, work_type, work_name,
        sanctioned_amount, cost_estimate, expenditure, status, start_year,
        start_month, start_date, expected_completion_date, actual_completion_date,
        completion_pct, contractor_name, anomaly_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19);`,
      [
        workRecord.id,
        workRecord.mp_id,
        workRecord.district_id,
        workRecord.state,
        workRecord.mp_name,
        workRecord.work_type,
        workRecord.work_name,
        workRecord.sanctioned_amount,
        workRecord.cost_estimate,
        workRecord.expenditure,
        workRecord.status,
        workRecord.start_year,
        workRecord.start_month,
        workRecord.start_date,
        workRecord.expected_completion_date,
        workRecord.actual_completion_date,
        workRecord.completion_pct,
        workRecord.contractor_name,
        workRecord.anomaly_type
      ]
    );
  }
  console.log(` Created ${worksList.length} work records.`);

  // 5. Seed Payments with Milestone Ledgers
  console.log('💳 Generating structured payment milestone ledgers...');
  const paymentModes = ['PFMS_EAT', 'Direct Bank Transfer', 'RTGS'];
  const releasingAuthorities = ['District Planning Officer', 'Treasury Officer', 'District Collector'];
  let paymentCount = 0;

  for (const w of worksList) {
    const exp = Number(w.expenditure) || 0;
    if (exp <= 0) continue;

    const numPayments = exp > 2000000 ? 3 : (exp > 500000 ? 2 : 1);
    const splitAmounts: number[] = [];

    if (numPayments === 1) {
      splitAmounts.push(exp);
    } else if (numPayments === 2) {
      splitAmounts.push(Math.round(exp * 0.4));
      splitAmounts.push(Math.round(exp * 0.6));
    } else {
      splitAmounts.push(Math.round(exp * 0.25));
      splitAmounts.push(Math.round(exp * 0.45));
      splitAmounts.push(Math.round(exp * 0.30));
    }

    const sYear = w.start_year || 2022;
    const sMonth = w.start_month || 1;

    for (let i = 0; i < splitAmounts.length; i++) {
      const pMonth = Math.min(12, sMonth + i * 3);
      const pYear = sMonth + i * 3 > 12 ? sYear + 1 : sYear;
      const paymentDate = `${pYear}-${String(pMonth).padStart(2, '0')}-15`;
      const pId = `PAY_${w.id}_${i + 1}`;

      await db.query(
        `INSERT INTO payments (
          id, work_id, payment_date, amount, payment_mode, released_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [
          pId,
          w.id,
          paymentDate,
          splitAmounts[i],
          paymentModes[i % paymentModes.length],
          releasingAuthorities[i % releasingAuthorities.length],
          'Released'
        ]
      );
      paymentCount++;
    }
  }
  console.log(` Created ${paymentCount} payment milestone records.`);

  // 6. Seed Assets with Deterministic Coordinates
  console.log('📍 Generating assets with deterministic geo-coordinates...');
  const assetsMap: Record<string, any> = {};
  const assetVerifiers = [
    'District Planning Officer',
    'Assistant Engineer (PWD)',
    'Block Development Officer',
    'Third-Party Inspection Team (TPIT)',
    'Social Audit Committee'
  ];
  let assetCount = 0;

  for (let idx = 0; idx < worksList.length; idx++) {
    const w = worksList[idx];
    const baseCoord = STATE_COORDS[w.state] || { lat: 20.5937, lng: 78.9629 };
    const offset = getDeterministicOffset(w.id);
    const lat = Number((baseCoord.lat + offset.dLat).toFixed(4));
    const lng = Number((baseCoord.lng + offset.dLng).toFixed(4));

    let assetStatus: 'Created' | 'Verified' | 'Not Verified' | 'Missing' = 'Created';
    let vDate: string | null = null;
    let vBy: string | null = null;

    if (w.status === 'Completed') {
      if (w.anomaly_type === 'unverified_high_value_asset') {
        assetStatus = 'Not Verified';
      } else {
        assetStatus = 'Verified';
        vDate = `${(w.start_year || 2023) + 1}-03-20`;
        vBy = assetVerifiers[idx % assetVerifiers.length];
      }
    } else if (w.status === 'Stalled') {
      assetStatus = 'Missing';
      vDate = `${(w.start_year || 2023) + 1}-01-15`;
      vBy = assetVerifiers[idx % assetVerifiers.length];
    } else if (w.completion_pct === 0) {
      assetStatus = 'Not Verified';
    } else {
      assetStatus = 'Created';
    }

    const assetRecord = {
      id: `AST_${w.id}`,
      work_id: w.id,
      asset_name: `${w.work_name} Asset`,
      asset_status: assetStatus,
      verification_date: vDate,
      verified_by: vBy,
      geo_lat: lat,
      geo_lng: lng,
      photo_url: `/assets/img/works/${w.id}_site.jpg`
    };

    assetsMap[w.id] = assetRecord;
    assetCount++;

    await db.query(
      `INSERT INTO assets (
        id, work_id, asset_name, asset_status, verification_date, verified_by, geo_lat, geo_lng, photo_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
      [
        assetRecord.id,
        assetRecord.work_id,
        assetRecord.asset_name,
        assetRecord.asset_status,
        assetRecord.verification_date,
        assetRecord.verified_by,
        assetRecord.geo_lat,
        assetRecord.geo_lng,
        assetRecord.photo_url
      ]
    );
  }
  console.log(` Created ${assetCount} asset records.`);

  // 7. Seed Alerts
  console.log('🚨 Generating and inserting statistical anomaly alerts...');
  const allAlerts = AIEngineService.generateAlerts(scoredMPs, worksList, assetsMap);

  for (const a of allAlerts) {
    await db.query(
      `INSERT INTO alerts (
        id, entity_type, entity_id, alert_type, risk_score, severity,
        status, title, description, mp_name, state, amount, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
      [
        a.id,
        a.entity_type,
        a.entity_id,
        a.alert_type,
        a.risk_score,
        a.severity,
        a.status,
        a.title,
        a.description || null,
        a.mp_name || null,
        a.state || null,
        a.amount || null,
        a.created_at || new Date().toISOString()
      ]
    );
  }
  console.log(` Saved ${allAlerts.length} anomaly alerts to database.`);

  // 8. Seed Default Users with Bcrypt Hashes
  console.log('🔑 Seeding authenticated users with bcrypt password hashing...');
  const defaultUsers: User[] = [
    {
      id: 'USR_MINISTRY_01',
      name: 'Dr. Ramesh Kumar (Director, DIID)',
      email: 'admin@mospi.gov.in',
      password_hash: hashPassword('Password@123'),
      role: 'Ministry',
      scope_id: 'ALL'
    },
    {
      id: 'USR_MINISTRY_02',
      name: 'Priya Sharma (Senior Analytics Lead)',
      email: 'analytics@mospi.gov.in',
      password_hash: hashPassword('Password@123'),
      role: 'Ministry',
      scope_id: 'ALL'
    },
    {
      id: 'USR_STATE_MH',
      name: 'Nodal Officer (Maharashtra SNA)',
      email: 'nodal.maharashtra@gov.in',
      password_hash: hashPassword('Password@123'),
      role: 'State',
      scope_id: 'Maharashtra'
    },
    {
      id: 'USR_STATE_TS',
      name: 'Nodal Officer (Telangana SNA)',
      email: 'nodal.telangana@gov.in',
      password_hash: hashPassword('Password@123'),
      role: 'State',
      scope_id: 'Telangana'
    },
    {
      id: 'USR_DIST_MUMBAI',
      name: 'District Collector (Mumbai City)',
      email: 'dm.mumbai@nic.in',
      password_hash: hashPassword('Password@123'),
      role: 'District',
      scope_id: 'DST_MAHARASHTRA_MUMBAI_CITY'
    },
    {
      id: 'USR_MP_01',
      name: 'Dr. Abhishek Manu Singhvi (Honble MP)',
      email: 'mp.abhishek@sansad.nic.in',
      password_hash: hashPassword('Password@123'),
      role: 'MP',
      scope_id: 'RS_Current_1'
    }
  ];

  for (const u of defaultUsers) {
    await db.query(
      `INSERT INTO users (id, name, email, password_hash, role, scope_id)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [u.id, u.name, u.email, u.password_hash, u.role, u.scope_id]
    );
  }
  console.log(` Created ${defaultUsers.length} system users with bcrypt protection.`);

  console.log('🎉 Database seeding completed successfully!');
  await db.close();
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
