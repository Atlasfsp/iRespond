export const SDGS = Object.freeze([
  { id: 1, name: 'No Poverty' },
  { id: 2, name: 'Zero Hunger' },
  { id: 3, name: 'Good Health and Well-being' },
  { id: 4, name: 'Quality Education' },
  { id: 5, name: 'Gender Equality' },
  { id: 6, name: 'Clean Water and Sanitation' },
  { id: 7, name: 'Affordable and Clean Energy' },
  { id: 8, name: 'Decent Work and Economic Growth' },
  { id: 9, name: 'Industry, Innovation and Infrastructure' },
  { id: 10, name: 'Reduced Inequalities' },
  { id: 11, name: 'Sustainable Cities and Communities' },
  { id: 12, name: 'Responsible Consumption and Production' },
  { id: 13, name: 'Climate Action' },
  { id: 14, name: 'Life Below Water' },
  { id: 15, name: 'Life on Land' },
  { id: 16, name: 'Peace, Justice and Strong Institutions' },
  { id: 17, name: 'Partnerships for the Goals' },
] as const);

export function toggleSdg(selected: readonly number[], id: number) {
  return selected.includes(id)
    ? selected.filter((value) => value !== id)
    : [...selected, id].sort((left, right) => left - right);
}
