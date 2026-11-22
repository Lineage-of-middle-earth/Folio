export interface CoverPreset {
  id: string;
  label: string;
  url: string;
  fallbackGradient: string;
}

export const COVER_PRESETS: CoverPreset[] = [
  {
    id: 'studio-desk',
    label: 'Architectural Studio',
    url: '/src/assets/images/cover_studio_desk_1794831195826.jpg',
    fallbackGradient: 'linear-gradient(135deg, #d6d3cd 0%, #edeae4 50%, #c9c4bb 100%)',
  },
  {
    id: 'linen-archive',
    label: 'Archival Linen',
    url: '/src/assets/images/cover_linen_archive_1794831195763.jpg',
    fallbackGradient: 'linear-gradient(135deg, #ece8df 0%, #f5f2ec 50%, #ded8cc 100%)',
  },
  {
    id: 'botanical-glass',
    label: 'Botanical Glass',
    url: '/src/assets/images/cover_botanical_glass_1794831195741.jpg',
    fallbackGradient: 'linear-gradient(135deg, #cfd6d2 0%, #e5e9e6 50%, #bec8c2 100%)',
  },
];

export function getCoverPresetByIndex(index: number): CoverPreset {
  return COVER_PRESETS[index % COVER_PRESETS.length];
}
