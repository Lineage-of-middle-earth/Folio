import coverStudioDesk from '../assets/images/cover_studio_desk_1794831195826.jpg';
import coverLinenArchive from '../assets/images/cover_linen_archive_1794831195763.jpg';
import coverBotanicalGlass from '../assets/images/cover_botanical_glass_1794831195741.jpg';
import coverAlpineMist from '../assets/images/cover_alpine_mist_1795532742817.jpg';
import coverTerracottaLight from '../assets/images/cover_terracotta_light_1795532744990.jpg';
import coverCoastalHorizon from '../assets/images/cover_coastal_horizon_1795532745514.jpg';
import coverCedarPavilion from '../assets/images/cover_cedar_pavilion_1795532744450.jpg';
import coverDesertDunes from '../assets/images/cover_desert_dunes_1795532742947.jpg';
import coverTwilightIndigo from '../assets/images/cover_twilight_indigo_1795532743638.jpg';

export interface CoverPreset {
  id: string;
  label: string;
  url: string;
  fallbackGradient: string;
}

export interface UploadedCoverItem {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

export const UPLOADED_COVERS_STORAGE_KEY = 'folio_uploaded_header_covers_v1';

export const COVER_PRESETS: CoverPreset[] = [
  {
    id: 'studio-desk',
    label: 'Architectural Studio',
    url: coverStudioDesk,
    fallbackGradient: 'linear-gradient(135deg, #d6d3cd 0%, #edeae4 50%, #c9c4bb 100%)',
  },
  {
    id: 'linen-archive',
    label: 'Archival Linen',
    url: coverLinenArchive,
    fallbackGradient: 'linear-gradient(135deg, #ece8df 0%, #f5f2ec 50%, #ded8cc 100%)',
  },
  {
    id: 'botanical-glass',
    label: 'Botanical Glass',
    url: coverBotanicalGlass,
    fallbackGradient: 'linear-gradient(135deg, #cfd6d2 0%, #e5e9e6 50%, #bec8c2 100%)',
  },
  {
    id: 'alpine-mist',
    label: 'Alpine Mist',
    url: coverAlpineMist,
    fallbackGradient: 'linear-gradient(135deg, #cbd5e1 0%, #e2e8f0 50%, #94a3b8 100%)',
  },
  {
    id: 'terracotta-light',
    label: 'Terracotta Light',
    url: coverTerracottaLight,
    fallbackGradient: 'linear-gradient(135deg, #d9b89c 0%, #e7d1bc 50%, #b37352 100%)',
  },
  {
    id: 'coastal-horizon',
    label: 'Coastal Horizon',
    url: coverCoastalHorizon,
    fallbackGradient: 'linear-gradient(135deg, #d5e5e7 0%, #eef2f5 50%, #c2d7dc 100%)',
  },
  {
    id: 'cedar-pavilion',
    label: 'Cedar Pavilion',
    url: coverCedarPavilion,
    fallbackGradient: 'linear-gradient(135deg, #d7be9d 0%, #eadac4 50%, #b59268 100%)',
  },
  {
    id: 'desert-dunes',
    label: 'Desert Dunes',
    url: coverDesertDunes,
    fallbackGradient: 'linear-gradient(135deg, #ebd6b8 0%, #f6ead8 50%, #d4b083 100%)',
  },
  {
    id: 'twilight-indigo',
    label: 'Twilight Indigo',
    url: coverTwilightIndigo,
    fallbackGradient: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #0f172a 100%)',
  },
];

export function getCoverPresetByIndex(index: number): CoverPreset {
  return COVER_PRESETS[index % COVER_PRESETS.length];
}

export function loadUploadedCovers(): UploadedCoverItem[] {
  try {
    const raw = localStorage.getItem(UPLOADED_COVERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveUploadedCovers(items: UploadedCoverItem[]): void {
  try {
    localStorage.setItem(UPLOADED_COVERS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

export function compressCoverImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1400;
        const maxHeight = 600;
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
