export const DEFAULT_PLANS = [
  {
    id: 'A',
    label: '方案 A（高铁）',
    recommended: true,
    trains: [{ id: 'G1234', time: '07:00-09:00', price: 200 }],
    flights: [],
    selectedTrain: 0,
    selectedFlight: 0,
  },
  {
    id: 'B',
    label: '方案 B（航班）',
    recommended: false,
    trains: [],
    flights: [{ id: 'MU123', time: '10:00-12:00', price: 600 }],
    selectedTrain: 0,
    selectedFlight: 0,
  },
]
