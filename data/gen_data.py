import zipfile, xml.etree.ElementTree as ET
import json, re, random

def parse_xlsx(path, source_label):
    records = []
    with zipfile.ZipFile(path, 'r') as z:
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.parse(z.open('xl/sharedStrings.xml'))
            for elem in tree.getroot().iter():
                if elem.tag.endswith('}t'):
                    strings.append(elem.text or '')
        
        for fname in z.namelist():
            if fname.startswith('xl/worksheets/sheet') and fname.endswith('.xml'):
                tree = ET.parse(z.open(fname))
                root = tree.getroot()
                row_num = 0
                for row in root.iter():
                    if row.tag.endswith('}row'):
                        row_num += 1
                        if row_num <= 2:
                            continue
                        cells = {}
                        for c in row:
                            ref = c.get('r', '')
                            col = ''.join(filter(str.isalpha, ref))
                            is_elem = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is')
                            if is_elem is not None:
                                t_elem = is_elem.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                                cells[col] = (t_elem.text or '') if t_elem is not None else ''
                                continue
                            t = c.get('t', '')
                            v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                            if v is not None and v.text:
                                cells[col] = strings[int(v.text)] if t == 's' else v.text
                        a = cells.get('A', '')
                        b = cells.get('B', '')
                        c_val = cells.get('C', '')
                        d = cells.get('D', '')
                        e = cells.get('E', '')
                        if not (a and b and c_val and e):
                            continue
                        try:
                            sno = int(float(a))
                        except Exception:
                            continue
                        try:
                            amt = float(e)
                        except Exception:
                            continue
                        term_match = re.search(r'\((\d{4})-(\d{2,4})\)', c_val)
                        term_start, term_end = None, None
                        if term_match:
                            term_start = int(term_match.group(1))
                            end_str = term_match.group(2)
                            if len(end_str) == 2:
                                term_end = int(str(term_start)[:2] + end_str)
                            else:
                                term_end = int(end_str)
                        clean_name = re.sub(r'\s*\(\d{4}-\d{2,4}\)\s*\(\d{4}-\d{4}\)', '', c_val).strip()
                        records.append({
                            'id': f'{source_label}_{sno}',
                            'sr_no': sno,
                            'state': b,
                            'mp_name': clean_name,
                            'mp_name_raw': c_val,
                            'type': d,
                            'allocated_amount': amt,
                            'term_start': term_start,
                            'term_end': term_end,
                            'source': source_label
                        })
    return records

r1 = parse_xlsx(r'Allocated Limit for Honble MPs (1).xlsx', 'RS_Current')
r2 = parse_xlsx(r'Allocated Limit for Honble MPs.xlsx', 'RS_Full')

print(f'Parsed: {len(r1)} RS_Current, {len(r2)} RS_Full')

random.seed(42)
states = list(set([r['state'] for r in r1 + r2]))
work_types = [
    'Road Construction', 'School Building', 'Water Supply',
    'Drainage System', 'Community Hall', 'Health Centre',
    'Bridge Construction', 'Street Lighting', 'Park Development',
    'Anganwadi Centre', 'Toilet Block', 'Solar Panel Installation'
]
statuses = ['Completed', 'In Progress', 'Tender Stage', 'Sanctioned', 'Stalled']
locations = ['Block A', 'Sector 4', 'Village Rampur', 'Ward 12', 'Panchayat Devpur', 'NH Bypass', 'District HQ', 'GP Office', 'Nagar Palika Zone 3']

synthetic_works = []
wid = 1
for mp in r1[:80]:
    n_works = random.randint(3, 15)
    for i in range(n_works):
        budget = random.randint(500000, 5000000)
        expenditure_pct = random.uniform(0.0, 1.3)
        expenditure = int(budget * expenditure_pct)
        start_year = random.randint(2020, 2024)
        start_month = random.randint(1, 12)
        status = random.choice(statuses)
        anomaly_type = None
        if expenditure > budget * 1.1:
            anomaly_type = 'cost_overrun'
        elif random.random() < 0.05:
            anomaly_type = 'duplicate_work'
        wtype = random.choice(work_types)
        loc = random.choice(locations)
        synthetic_works.append({
            'work_id': f'W{wid:04d}',
            'mp_id': mp['id'],
            'mp_name': mp['mp_name'],
            'state': mp['state'],
            'work_type': wtype,
            'work_name': f'{wtype} at {loc}',
            'sanctioned_amount': budget,
            'expenditure': expenditure,
            'status': status,
            'start_year': start_year,
            'start_month': start_month,
            'completion_pct': min(100, int(expenditure_pct * 100)),
            'anomaly_type': anomaly_type
        })
        wid += 1

output = {
    'rs_current': r1,
    'rs_full': r2,
    'synthetic_works': synthetic_works,
    'metadata': {
        'rs_current_count': len(r1),
        'rs_full_count': len(r2),
        'total_allocated_current': sum(r['allocated_amount'] for r in r1),
        'total_allocated_full': sum(r['allocated_amount'] for r in r2),
        'works_count': len(synthetic_works),
        'states': sorted(states)
    }
}

with open('js/data.js', 'w', encoding='utf-8') as f:
    f.write('// MPLADS Dataset — Parsed from official Excel files + Synthetic Works Data\n')
    f.write('const MPLADS_DATA = ')
    json.dump(output, f, ensure_ascii=False, indent=2)
    f.write(';\n')

print(f'js/data.js written — {len(synthetic_works)} works generated')
