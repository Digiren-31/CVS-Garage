// Identity seeds and semantic surface values belong here, never in service CSS.
export const seeds = {
  portal: '#0F6CBD', projects: '#5B5FC7', events: '#C239B3',
  'member-centre': '#1E6B3F', leaderboards: '#A15C00', 'idea-centre': '#D83B01', forum: '#007E8C',
};
export const surfaces = {
  light: { page: '#f7f8f5', surface: '#ffffff', subtle: '#f0f2ed', text: '#222b27', muted: '#59625b', border: '#d7ddd6', strongBorder: '#78847a', ink: '#193d33', paper: '#edf0e5', onInk: '#f6f8f0' },
  dark: { page: '#171d1b', surface: '#202824', subtle: '#27312c', text: '#eef2ec', muted: '#b2bdb4', border: '#3b4840', strongBorder: '#839489', ink: '#ceddc5', paper: '#28362d', onInk: '#193126' },
};
export function mix(hex, target, amount) {
  const channel = (index) => Math.round(parseInt(hex.slice(index, index + 2), 16) * (1 - amount) + parseInt(target.slice(index, index + 2), 16) * amount).toString(16).padStart(2, '0');
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}
export function ramp(seed) {
  return Object.fromEntries(Array.from({ length: 16 }, (_, index) => {
    const step = (index + 1) * 10;
    return [step, step <= 80 ? mix(seed, '#000000', (80 - step) / 80) : mix(seed, '#ffffff', (step - 80) / 90)];
  }));
}
export function accent(seed, mode) { return mode === 'dark' ? mix(seed, '#ffffff', 0.6) : mix(seed, '#000000', 0.18); }
