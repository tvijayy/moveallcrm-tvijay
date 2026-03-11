require('dotenv').config();
const bcrypt = require('bcryptjs');
const { supabase } = require('../src/config/database');

async function seed() {
    try {
        // --- USERS ---
        const adminHash = await bcrypt.hash('admin123', 10);
        const staffHash = await bcrypt.hash('staff123', 10);

        const { error: usersError } = await supabase.from('users').upsert([
            { name: 'Admin User',  phone: '0400 000 001', email: 'admin@movehome.com',  password_hash: adminHash, role: 'admin' },
            { name: 'Jane Cooper', phone: '0400 000 002', email: 'jane@movehome.com',   password_hash: staffHash, role: 'staff' },
            { name: 'Mike Ross',   phone: '0400 000 003', email: 'mike@movehome.com',   password_hash: staffHash, role: 'staff' },
            { name: 'Rachel Zane', phone: '0400 000 004', email: 'rachel@movehome.com', password_hash: staffHash, role: 'staff' },
        ], { onConflict: 'email' });
        if (usersError) throw new Error('Users: ' + usersError.message);
        console.log('✅ Seeded 4 users');

        // --- LEADS ---
        const { error: leadsError } = await supabase.from('leads').insert([
            { customer_name: 'John Smith',     phone: '0412 345 678', email: 'john@email.com',      move_date: '2026-03-15', status: 'new',       extra_request: 'Piano moving' },
            { customer_name: 'Sarah Johnson',  phone: '0423 456 789', email: 'sarah.j@gmail.com',   move_date: '2026-03-20', status: 'contacted', extra_request: 'Packing materials needed' },
            { customer_name: 'Michael Chen',   phone: '0434 567 890', email: 'mchen@outlook.com',   move_date: '2026-04-01', status: 'quoted',    extra_request: null },
            { customer_name: 'Emma Wilson',    phone: '0445 678 901', email: 'emma.w@company.com',  move_date: '2026-02-28', status: 'won',       extra_request: 'Fragile items – artwork' },
            { customer_name: 'David Brown',    phone: '0456 789 012', email: 'dbrown@email.com',    move_date: '2026-03-05', status: 'lost',      extra_request: 'Storage needed' },
            { customer_name: 'Lisa Taylor',    phone: '0467 890 123', email: 'lisa.t@gmail.com',    move_date: '2026-03-25', status: 'new',       extra_request: null },
            { customer_name: 'James Anderson', phone: '0478 901 234', email: 'janderson@work.com',  move_date: '2026-04-10', status: 'contacted', extra_request: 'Pool table' },
            { customer_name: 'Amy Martinez',   phone: '0489 012 345', email: 'amy.m@email.com',     move_date: '2026-03-12', status: 'won',       extra_request: 'Pet transport' },
        ]);
        if (leadsError) throw new Error('Leads: ' + leadsError.message);
        console.log('✅ Seeded 8 leads');

        // --- JOBS ---
        const { error: jobsError } = await supabase.from('jobs').insert([
            { first_name: 'John',    last_name: 'Smith',   phone: '0412 345 678', email: 'john@email.com',   team: 'Team Alpha', contractor: 'FastMove Co', extras: 'Piano',             deposit: 500, invoice: 'INV-001', move_out: '15 King St, Sydney',       second_stop: null,        move_in: '42 Pitt St, Melbourne',       on_way_sms: 'sent',     last_sms: 'sent',     time_sheet: '8am-4pm',  move_date: '2026-03-10', brand: 'MoveHome Premium',  status: 'scheduled' },
            { first_name: 'Sarah',   last_name: 'Johnson', phone: '0423 456 789', email: 'sarah@email.com',  team: 'Team Beta',  contractor: null,           extras: 'Packing, Fragile',  deposit: 300, invoice: 'INV-002', move_out: '8 George St, Brisbane',     second_stop: '101 Albert St', move_in: '55 Creek Rd, Gold Coast',  on_way_sms: 'not_sent', last_sms: 'not_sent', time_sheet: '7am-3pm',  move_date: '2026-03-12', brand: 'MoveHome Standard', status: 'scheduled' },
            { first_name: 'Michael', last_name: 'Chen',    phone: '0434 567 890', email: 'mchen@email.com',  team: 'Team Alpha', contractor: 'ProHaul Ltd',  extras: null,                deposit: 0,   invoice: 'INV-003', move_out: '22 Collins St, Melbourne',  second_stop: null,        move_in: '7 Flinders St, Melbourne',    on_way_sms: 'sent',     last_sms: 'sent',     time_sheet: '9am-5pm',  move_date: '2026-02-20', brand: 'MoveHome Premium',  status: 'completed' },
            { first_name: 'Emma',    last_name: 'Wilson',  phone: '0445 678 901', email: 'emma@email.com',   team: 'Team Gamma', contractor: null,           extras: 'Pool Table',        deposit: 750, invoice: 'INV-004', move_out: '3 Queen St, Perth',         second_stop: '88 Hay St', move_in: '19 Murray St, Perth',         on_way_sms: 'not_sent', last_sms: 'not_sent', time_sheet: '8am-6pm',  move_date: '2026-03-18', brand: 'MoveHome Premium',  status: 'scheduled' },
            { first_name: 'David',   last_name: 'Brown',   phone: '0456 789 012', email: 'dbrown@email.com', team: 'Team Beta',  contractor: 'QuickShift',   extras: 'Appliances',        deposit: 200, invoice: 'INV-005', move_out: '10 North Tce, Adelaide',    second_stop: null,        move_in: '45 Rundle Mall, Adelaide',    on_way_sms: 'sent',     last_sms: 'not_sent', time_sheet: '10am-4pm', move_date: '2026-01-15', brand: 'MoveHome Standard', status: 'completed' },
            { first_name: 'Lisa',    last_name: 'Taylor',  phone: '0467 890 123', email: 'lisa@email.com',   team: 'Team Alpha', contractor: null,           extras: null,                deposit: 400, invoice: 'INV-006', move_out: '67 Elizabeth St, Hobart',   second_stop: null,        move_in: '12 Davey St, Hobart',         on_way_sms: 'not_sent', last_sms: 'not_sent', time_sheet: '8am-3pm',  move_date: '2026-03-22', brand: 'MoveHome Standard', status: 'scheduled' },
        ]);
        if (jobsError) throw new Error('Jobs: ' + jobsError.message);
        console.log('✅ Seeded 6 jobs');

        // --- STORAGE MASTERLIST ---
        const { error: storageError } = await supabase.from('storage_masterlist').insert([
            { storage_location: 'Warehouse A – Sydney',    move_in_date: '2026-01-15', unit_numbers: 'A1, A2',      padlock_code: '4532', client_name: 'John Smith',    mobile: '0412 345 678', email: 'john@email.com',   phone: '02 9876 5432', repeated_invoice: 'Monthly',   stripe_sub: 'sub_abc123', sell_price: 350, buy_price: 200, margin: 150, status: 'active' },
            { storage_location: 'Warehouse B – Melbourne', move_in_date: '2026-02-01', unit_numbers: 'B5',          padlock_code: '7891', client_name: 'Sarah Johnson', mobile: '0423 456 789', email: 'sarah@email.com',  phone: '03 1234 5678', repeated_invoice: 'Monthly',   stripe_sub: 'sub_def456', sell_price: 280, buy_price: 180, margin: 100, status: 'active' },
            { storage_location: 'Warehouse A – Sydney',    move_in_date: '2025-06-10', unit_numbers: 'A8, A9, A10', padlock_code: '2345', client_name: 'Michael Chen',  mobile: '0434 567 890', email: 'mchen@email.com',  phone: null,           repeated_invoice: 'Quarterly', stripe_sub: 'sub_ghi789', sell_price: 750, buy_price: 500, margin: 250, status: 'archived' },
            { storage_location: 'Warehouse C – Brisbane',  move_in_date: '2026-02-20', unit_numbers: 'C3',          padlock_code: '9012', client_name: 'Emma Wilson',   mobile: '0445 678 901', email: 'emma@email.com',   phone: '07 5555 1234', repeated_invoice: 'Monthly',   stripe_sub: null,         sell_price: 200, buy_price: 120, margin: 80,  status: 'active' },
            { storage_location: 'Warehouse B – Melbourne', move_in_date: '2025-03-01', unit_numbers: 'B12',         padlock_code: '5678', client_name: 'David Brown',   mobile: '0456 789 012', email: 'dbrown@email.com', phone: '03 9999 8888', repeated_invoice: 'Monthly',   stripe_sub: 'sub_jkl012', sell_price: 300, buy_price: 200, margin: 100, status: 'archived' },
        ]);
        if (storageError) throw new Error('Storage: ' + storageError.message);
        console.log('✅ Seeded 5 storage entries');

        // --- CONTACTS ---
        const { error: contactsError } = await supabase.from('contacts').insert([
            { client_name: 'Smith Household',     address: '15 King St, Sydney NSW 2000',      first_name: 'John',    last_name: 'Smith',    email: 'john@email.com',    mobile: '0412 345 678', category: 'residential', related_jobs: 'JOB-001, JOB-005', last_move_date: '2026-02-15', last_move_in: '42 Pitt St, Melbourne',    last_team: 'Team Alpha' },
            { client_name: 'Johnson Corp',        address: '88 Collins St, Melbourne VIC 3000', first_name: 'Sarah',   last_name: 'Johnson',  email: 'sarah@company.com', mobile: '0423 456 789', category: 'corporate',   related_jobs: 'JOB-002',          last_move_date: '2026-01-20', last_move_in: '55 Creek Rd, Gold Coast',  last_team: 'Team Beta' },
            { client_name: 'Chen Family',         address: '22 George St, Brisbane QLD 4000',  first_name: 'Michael', last_name: 'Chen',     email: 'mchen@email.com',   mobile: '0434 567 890', category: 'residential', related_jobs: 'JOB-003',          last_move_date: '2025-12-01', last_move_in: '7 Flinders St, Melbourne', last_team: 'Team Alpha' },
            { client_name: 'Wilson & Associates', address: '3 Queen St, Perth WA 6000',        first_name: 'Emma',    last_name: 'Wilson',   email: 'emma@wilson.com',   mobile: '0445 678 901', category: 'commercial',  related_jobs: 'JOB-004, JOB-008', last_move_date: '2026-02-10', last_move_in: '19 Murray St, Perth',      last_team: 'Team Gamma' },
            { client_name: 'Brown Residence',     address: '10 North Tce, Adelaide SA 5000',   first_name: 'David',   last_name: 'Brown',    email: 'dbrown@email.com',  mobile: '0456 789 012', category: 'residential', related_jobs: 'JOB-005',          last_move_date: '2025-11-15', last_move_in: '45 Rundle Mall, Adelaide', last_team: 'Team Beta' },
        ]);
        if (contactsError) throw new Error('Contacts: ' + contactsError.message);
        console.log('✅ Seeded 5 contacts');

        // --- CONTRACTORS ---
        const { error: contractorsError } = await supabase.from('contractors').insert([
            { company: 'FastMove Co',    category: 'subcontractor', tag: 'Premium',  rates: '$65/hr', trucks: '3x Large, 1x Small', first_name: 'Tom',   last_name: 'Harris',   phone: '0412 111 222', email: 'tom@fastmove.com',       linkedin: 'https://linkedin.com/in/tomharris' },
            { company: 'ProHaul Ltd',    category: 'driver',        tag: 'Budget',   rates: '$45/hr', trucks: '2x Medium',          first_name: 'Jake',  last_name: 'Williams', phone: '0423 222 333', email: 'jake@prohaul.com',       linkedin: null },
            { company: 'QuickShift',     category: 'mover',         tag: 'Standard', rates: '$55/hr', trucks: '1x Large',           first_name: 'Ryan',  last_name: 'Davis',    phone: '0434 333 444', email: 'ryan@quickshift.com',    linkedin: 'https://linkedin.com/in/ryandavis' },
            { company: 'Elite Removals', category: 'subcontractor', tag: 'Premium',  rates: '$80/hr', trucks: '4x Large, 2x Small', first_name: 'Mark',  last_name: 'Thompson', phone: '0445 444 555', email: 'mark@eliteremovals.com', linkedin: 'https://linkedin.com/in/markthompson' },
            { company: 'City Movers',    category: 'mover',         tag: 'Standard', rates: '$50/hr', trucks: '2x Large',           first_name: 'Steve', last_name: 'Garcia',   phone: '0456 555 666', email: 'steve@citymovers.com',   linkedin: null },
        ]);
        if (contractorsError) throw new Error('Contractors: ' + contractorsError.message);
        console.log('✅ Seeded 5 contractors');

        console.log('\n🎉 All seed data inserted successfully!');
        console.log('\n📋 Demo Credentials:');
        console.log('   Admin: admin@movehome.com / admin123');
        console.log('   Staff: jane@movehome.com  / staff123');

    } catch (error) {
        console.error('❌ Seed failed:', error.message);
        process.exit(1);
    }
}

seed();
