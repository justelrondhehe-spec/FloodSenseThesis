export const floodData = {
  waterLevel: 1.2,
  trend: 'rising' as const,
  riskLevel: 'MODERATE RISK' as const,
  rainfall: 'Moderate',
  rainfallSub: 'intensity',
  temperature: 27,
  feelsLike: 31,
  windSpeed: 18,
  windDirection: 'northeast',
  lastUpdated: '08:43 AM',
  barangay: 'BARANGAY Pamplona Tres',
  status: 'LIVE',
};

export const emergencyContacts = [
  {
    id: '1',
    name: 'NDRRMC Hotline',
    subtitle: 'National Disaster Risk',
    number: '911',
    icon: 'shield',
  },
  {
    id: '2',
    name: 'Barangay Pamplona Tres Office',
    subtitle: 'Local Government Unit',
    number: '(02) 8123-4567',
    icon: 'home',
  },
  {
    id: '3',
    name: 'Philippine Red Cross',
    subtitle: 'Medical & Rescue Services',
    number: '143',
    icon: 'shield',
  },
  {
    id: '4',
    name: 'PAGASA Weather',
    subtitle: 'Weather Forecast Authority',
    number: '(02) 8927-1335',
    icon: 'radio',
  },
  {
    id: '5',
    name: 'Local Rescue Team',
    subtitle: 'Barangay Pamplona Tres Response',
    number: '(02) 8555-0100',
    icon: 'alert-circle',
  },
];

export const safetyGuidelines = [
  {
    id: 'before',
    phase: 'BEFORE',
    title: 'Before a Flood',
    color: '#FF6B35',
    icon: 'briefcase',
    tips: [
      { icon: 'package', text: 'Prepare an emergency kit with essentials' },
      { icon: 'map', text: 'Know your evacuation routes' },
      { icon: 'folder', text: 'Keep documents in waterproof containers' },
    ],
  },
  {
    id: 'during',
    phase: 'DURING',
    title: 'During a Flood',
    color: '#FF6B35',
    icon: 'alert-triangle',
    tips: [
      { icon: 'trending-up', text: 'Move to higher ground immediately' },
      { icon: 'droplet', text: 'Avoid walking through flood waters' },
      { icon: 'radio', text: 'Stay informed through official channels' },
    ],
  },
  {
    id: 'after',
    phase: 'AFTER',
    title: 'After a Flood',
    color: '#27AE60',
    icon: 'check-circle',
    tips: [
      { icon: 'bell', text: 'Wait for authorities to declare area safe' },
      { icon: 'camera', text: 'Document damage for insurance claims' },
      { icon: 'home', text: 'Avoid flood-damaged buildings' },
    ],
  },
];