import ExifReader from 'exifreader';

export interface ExifData {
  dateTaken: string | null; // ISO date string (YYYY-MM-DD)
  latitude: number | null;
  longitude: number | null;
}

/**
 * Extract EXIF data (date taken, GPS coordinates) from an image file.
 * Must be called BEFORE image compression, which strips EXIF.
 */
export async function extractExifData(file: File): Promise<ExifData> {
  const result: ExifData = {
    dateTaken: null,
    latitude: null,
    longitude: null,
  };

  try {
    if (!file.type.startsWith('image/')) return result;

    const arrayBuffer = await file.arrayBuffer();
    const tags = ExifReader.load(arrayBuffer, { expanded: true });

    // Extract date
    const dateTag =
      tags.exif?.DateTimeOriginal?.description ||
      tags.exif?.DateTimeDigitized?.description ||
      tags.exif?.DateTime?.description;

    if (dateTag) {
      // EXIF dates are "YYYY:MM:DD HH:MM:SS" — convert to ISO date
      const cleaned = dateTag.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
      const parsed = new Date(cleaned);
      if (!isNaN(parsed.getTime())) {
        result.dateTaken = parsed.toISOString().split('T')[0];
      }
    }

    // Extract GPS
    if (tags.gps?.Latitude != null && tags.gps?.Longitude != null) {
      result.latitude = tags.gps.Latitude;
      result.longitude = tags.gps.Longitude;
    }
  } catch (err) {
    console.warn('EXIF extraction failed:', err);
  }

  return result;
}

/**
 * Reverse-geocode GPS coordinates to find matching zip and city tags
 * from the gallery_tags table. Uses a simple bounding-box lookup
 * against a built-in DFW zip code coordinate map.
 */
export interface MatchedLocationTags {
  zipCode: string | null;
  city: string | null;
}

// DFW zip codes with approximate center coordinates
// This covers the primary service area. Can be expanded.
const DFW_ZIP_COORDS: Record<string, { lat: number; lng: number; city: string }> = {
  '75201': { lat: 32.789, lng: -96.799, city: 'Dallas' },
  '75202': { lat: 32.781, lng: -96.800, city: 'Dallas' },
  '75203': { lat: 32.744, lng: -96.793, city: 'Dallas' },
  '75204': { lat: 32.800, lng: -96.789, city: 'Dallas' },
  '75205': { lat: 32.833, lng: -96.793, city: 'Dallas' },
  '75206': { lat: 32.828, lng: -96.772, city: 'Dallas' },
  '75207': { lat: 32.788, lng: -96.834, city: 'Dallas' },
  '75208': { lat: 32.744, lng: -96.838, city: 'Dallas' },
  '75209': { lat: 32.843, lng: -96.821, city: 'Dallas' },
  '75210': { lat: 32.762, lng: -96.763, city: 'Dallas' },
  '75211': { lat: 32.738, lng: -96.877, city: 'Dallas' },
  '75212': { lat: 32.778, lng: -96.870, city: 'Dallas' },
  '75214': { lat: 32.821, lng: -96.750, city: 'Dallas' },
  '75215': { lat: 32.745, lng: -96.773, city: 'Dallas' },
  '75216': { lat: 32.707, lng: -96.784, city: 'Dallas' },
  '75217': { lat: 32.708, lng: -96.729, city: 'Dallas' },
  '75218': { lat: 32.833, lng: -96.718, city: 'Dallas' },
  '75219': { lat: 32.811, lng: -96.809, city: 'Dallas' },
  '75220': { lat: 32.861, lng: -96.865, city: 'Dallas' },
  '75223': { lat: 32.791, lng: -96.762, city: 'Dallas' },
  '75224': { lat: 32.712, lng: -96.832, city: 'Dallas' },
  '75225': { lat: 32.866, lng: -96.788, city: 'Dallas' },
  '75226': { lat: 32.785, lng: -96.772, city: 'Dallas' },
  '75227': { lat: 32.773, lng: -96.710, city: 'Dallas' },
  '75228': { lat: 32.802, lng: -96.685, city: 'Dallas' },
  '75229': { lat: 32.886, lng: -96.862, city: 'Dallas' },
  '75230': { lat: 32.897, lng: -96.798, city: 'Dallas' },
  '75231': { lat: 32.881, lng: -96.755, city: 'Dallas' },
  '75232': { lat: 32.677, lng: -96.840, city: 'Dallas' },
  '75233': { lat: 32.705, lng: -96.867, city: 'Dallas' },
  '75234': { lat: 32.921, lng: -96.888, city: 'Dallas' },
  '75235': { lat: 32.844, lng: -96.845, city: 'Dallas' },
  '75236': { lat: 32.681, lng: -96.886, city: 'Dallas' },
  '75237': { lat: 32.661, lng: -96.847, city: 'Dallas' },
  '75238': { lat: 32.870, lng: -96.712, city: 'Dallas' },
  '75240': { lat: 32.918, lng: -96.797, city: 'Dallas' },
  '75241': { lat: 32.653, lng: -96.775, city: 'Dallas' },
  '75243': { lat: 32.901, lng: -96.752, city: 'Dallas' },
  '75244': { lat: 32.930, lng: -96.842, city: 'Dallas' },
  '75246': { lat: 32.789, lng: -96.778, city: 'Dallas' },
  '75247': { lat: 32.818, lng: -96.863, city: 'Dallas' },
  '75248': { lat: 32.948, lng: -96.804, city: 'Dallas' },
  '75249': { lat: 32.650, lng: -96.899, city: 'Dallas' },
  '75251': { lat: 32.921, lng: -96.776, city: 'Dallas' },
  '75252': { lat: 32.954, lng: -96.770, city: 'Dallas' },
  '75253': { lat: 32.635, lng: -96.713, city: 'Dallas' },
  '75254': { lat: 32.943, lng: -96.822, city: 'Dallas' },
  '75006': { lat: 32.945, lng: -96.892, city: 'Carrollton' },
  '75007': { lat: 32.975, lng: -96.897, city: 'Carrollton' },
  '75019': { lat: 32.976, lng: -96.942, city: 'Carrollton' },
  '75010': { lat: 32.975, lng: -96.872, city: 'Carrollton' },
  '75038': { lat: 32.860, lng: -96.958, city: 'Irving' },
  '75039': { lat: 32.878, lng: -96.938, city: 'Irving' },
  '75040': { lat: 32.855, lng: -96.622, city: 'Garland' },
  '75041': { lat: 32.837, lng: -96.657, city: 'Garland' },
  '75042': { lat: 32.882, lng: -96.651, city: 'Garland' },
  '75043': { lat: 32.808, lng: -96.607, city: 'Garland' },
  '75044': { lat: 32.914, lng: -96.635, city: 'Garland' },
  '75048': { lat: 32.940, lng: -96.598, city: 'Garland' },
  '75060': { lat: 32.813, lng: -96.943, city: 'Irving' },
  '75061': { lat: 32.830, lng: -96.963, city: 'Irving' },
  '75062': { lat: 32.848, lng: -96.979, city: 'Irving' },
  '75063': { lat: 32.886, lng: -96.975, city: 'Irving' },
  '75050': { lat: 32.733, lng: -96.973, city: 'Grand Prairie' },
  '75051': { lat: 32.714, lng: -97.002, city: 'Grand Prairie' },
  '75052': { lat: 32.681, lng: -97.014, city: 'Grand Prairie' },
  '75080': { lat: 32.948, lng: -96.721, city: 'Richardson' },
  '75081': { lat: 32.936, lng: -96.690, city: 'Richardson' },
  '75082': { lat: 32.971, lng: -96.686, city: 'Richardson' },
  '75023': { lat: 33.044, lng: -96.737, city: 'Plano' },
  '75024': { lat: 33.058, lng: -96.779, city: 'Plano' },
  '75025': { lat: 33.068, lng: -96.729, city: 'Plano' },
  '75034': { lat: 33.127, lng: -96.816, city: 'Frisco' },
  '75035': { lat: 33.146, lng: -96.787, city: 'Frisco' },
  '75070': { lat: 33.168, lng: -96.680, city: 'McKinney' },
  '75071': { lat: 33.227, lng: -96.695, city: 'McKinney' },
  '75069': { lat: 33.198, lng: -96.618, city: 'McKinney' },
  '75013': { lat: 33.021, lng: -96.692, city: 'Allen' },
  '75002': { lat: 33.083, lng: -96.659, city: 'Allen' },
  '75009': { lat: 33.174, lng: -96.599, city: 'Allen' },
  '75028': { lat: 33.020, lng: -96.951, city: 'Lewisville' },
  '75067': { lat: 33.046, lng: -96.979, city: 'Lewisville' },
  '75056': { lat: 33.078, lng: -96.906, city: 'Lewisville' },
  '75149': { lat: 32.747, lng: -96.600, city: 'Mesquite' },
  '75150': { lat: 32.772, lng: -96.621, city: 'Mesquite' },
  '76201': { lat: 33.216, lng: -97.144, city: 'Denton' },
  '76205': { lat: 33.189, lng: -97.131, city: 'Denton' },
  '76210': { lat: 33.168, lng: -97.086, city: 'Denton' },
  '76011': { lat: 32.755, lng: -97.093, city: 'Arlington' },
  '76012': { lat: 32.741, lng: -97.137, city: 'Arlington' },
  '76013': { lat: 32.710, lng: -97.146, city: 'Arlington' },
  '76014': { lat: 32.694, lng: -97.098, city: 'Arlington' },
  '76015': { lat: 32.697, lng: -97.137, city: 'Arlington' },
  '76016': { lat: 32.702, lng: -97.176, city: 'Arlington' },
  '76017': { lat: 32.671, lng: -97.156, city: 'Arlington' },
  '76018': { lat: 32.664, lng: -97.098, city: 'Arlington' },
  '76006': { lat: 32.777, lng: -97.089, city: 'Arlington' },
  '76010': { lat: 32.741, lng: -97.067, city: 'Arlington' },
};

/**
 * Find the closest zip code and city for given GPS coordinates.
 * Returns null if no match within ~5 miles.
 */
export function matchGpsToLocation(lat: number, lng: number): MatchedLocationTags {
  let closestZip: string | null = null;
  let closestCity: string | null = null;
  let minDist = Infinity;

  // ~5 miles in degrees (rough approximation at DFW latitude)
  const MAX_DIST = 0.08;

  for (const [zip, coords] of Object.entries(DFW_ZIP_COORDS)) {
    const dist = Math.sqrt(
      Math.pow(lat - coords.lat, 2) + Math.pow(lng - coords.lng, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      closestZip = zip;
      closestCity = coords.city;
    }
  }

  if (minDist > MAX_DIST) {
    return { zipCode: null, city: null };
  }

  return { zipCode: closestZip, city: closestCity };
}
