// Demo data for super-admin dashboard sections where backend APIs are not yet available.
// Clearly labeled wherever used. Disabled by default in production.
export const DEMO_MODE = false;

export const DEMO_ENROLLMENT_TREND = [
  { month: 'Jan', students: 11200 },
  { month: 'Feb', students: 11500 },
  { month: 'Mar', students: 11800 },
  { month: 'Apr', students: 12100 },
  { month: 'May', students: 12400 },
  { month: 'Jun', students: 12600 },
  { month: 'Jul', students: 14100 },
  { month: 'Aug', students: 14500 },
  { month: 'Sep', students: 15200 },
  { month: 'Oct', students: 15800 },
  { month: 'Nov', students: 16200 },
  { month: 'Dec', students: 17300 },
];

export const DEMO_STUDENTS_BY_LEVEL = [
  { name: 'Primary', value: 9842, color: '#2563EB' },
  { name: 'Secondary', value: 6231, color: '#22C55E' },
  { name: 'A-Level', value: 1248, color: '#F97316' },
  { name: 'TVET', value: 876, color: '#8B5CF6' },
  { name: 'Other', value: 635, color: '#94A3B8' },
];

export const DEMO_SCHOOLS_BY_LEVEL = [
  { level: 'Primary', count: 8 },
  { level: 'Secondary', count: 7 },
  { level: 'A-Level', count: 5 },
  { level: 'TVET', count: 4 },
];

export const DEMO_SCHOOLS_TABLE = [
  { id: 1, name: 'Green Valley Secondary School', code: 'GVS-01', level: 'Secondary', students: 1892, status: 'Active' },
  { id: 2, name: 'Kigali Primary School', code: 'KPS-12', level: 'Primary', students: 1245, status: 'Active' },
  { id: 3, name: 'Rwamagana Primary School', code: 'RPS-03', level: 'Primary', students: 1120, status: 'Active' },
  { id: 4, name: 'Nyabihu Secondary School', code: 'NSS-07', level: 'Secondary', students: 986, status: 'Active' },
  { id: 5, name: 'Muhanga TVET School', code: 'MVS-05', level: 'TVET', students: 734, status: 'Active' },
];

export const DEMO_SYSTEM_HEALTH = [
  { service: 'Backend API', status: 'Operational', uptime: '99.98%' },
  { service: 'Database', status: 'Operational', uptime: '99.99%' },
  { service: 'File Storage', status: 'Operational', uptime: '99.95%' },
  { service: 'Notifications', status: 'Operational', uptime: '99.90%' },
];

export const DEMO_RECENT_ACTIVITY = [
  { actor: 'Rwamagana Primary School', action: 'New school registered', entity: 'School', time: '2 hours ago', icon: 'Building2' },
  { actor: 'Jean Claude (Teacher)', action: 'User account created', entity: 'User', time: '3 hours ago', icon: 'Users' },
  { actor: 'Primary 6 - Mathematics', action: 'Marks submitted', entity: 'Assessment', time: '5 hours ago', icon: 'ClipboardCheck' },
  { actor: 'S1 - Term 1', action: 'Report card generated', entity: 'Report Card', time: '8 hours ago', icon: 'FileText' },
  { actor: 'Kigali Primary School', action: 'School updated', entity: 'School', time: '10 hours ago', icon: 'Building2' },
  { actor: 'Anita Uwimana (Parent)', action: 'New user registered', entity: 'User', time: '12 hours ago', icon: 'Users' },
];
