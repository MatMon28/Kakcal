import type { MealPhoto } from '../types/journal';
import { isPhotoRef, photoBytes } from '../storage/photoStore';

const encoder = new TextEncoder();
const concat = (parts: Uint8Array[]) => {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
};
const csvCell = (text: string) => `"${(/^[=+@\-\t\r]/.test(text) ? "'" : '') + text.replace(/"/g, '""')}"`;
const xml = (text: string) => text.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);

function withPhotoMetadata(bytes: Uint8Array, photo: MealPhoto) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const packet = encoder.encode(`http://ns.adobe.com/xap/1.0/\0<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/"><dc:description><rdf:Alt><rdf:li xml:lang="x-default">${xml(photo.note)}</rdf:li></rdf:Alt></dc:description><dc:subject><rdf:Bag><rdf:li>${xml(photo.slot)}</rdf:li></rdf:Bag></dc:subject><xmp:CreateDate>${xml(photo.date)}T12:00:00</xmp:CreateDate></rdf:Description></rdf:RDF></x:xmpmeta>`);
  if (packet.length > 65530) return bytes;
  const length = packet.length + 2;
  return concat([bytes.slice(0, 2), new Uint8Array([0xff, 0xe1, length >> 8, length & 255]), packet, bytes.slice(2)]);
}

// Store-only ZIP: photos are already compressed. Standard ZIP readers need no special app.
export function zip(files: { name: string; bytes: Uint8Array }[]) {
  const local: Uint8Array[] = [], directory: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    let crc = 0xffffffff;
    for (const byte of file.bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const header = new Uint8Array(30 + name.length), h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true); h.setUint16(12, 33, true);
    h.setUint32(14, crc, true); h.setUint32(18, file.bytes.length, true); h.setUint32(22, file.bytes.length, true); h.setUint16(26, name.length, true); header.set(name, 30);
    const central = new Uint8Array(46 + name.length), c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true); c.setUint16(14, 33, true);
    c.setUint32(16, crc, true); c.setUint32(20, file.bytes.length, true); c.setUint32(24, file.bytes.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true); central.set(name, 46);
    local.push(header, file.bytes); directory.push(central); offset += header.length + file.bytes.length;
  }
  const size = directory.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, offset, true);
  return new Blob([...local, ...directory, end].map((part) => part.slice().buffer as ArrayBuffer), { type: 'application/zip' });
}

export async function exportMealPictures(photos: MealPhoto[]) {
  if (!photos.length) throw new Error('empty');
  const files: { name: string; bytes: Uint8Array }[] = [];
  const csv = [['Filename', 'Date', 'Meal', 'Note', 'Created'].map((s) => `"${s}"`).join(',')];
  for (const [index, photo] of photos.entries()) {
    const safeLocal = photo.src.startsWith('data:image/') || isPhotoRef(photo.src) || ((photo.src.startsWith(import.meta.env.BASE_URL + 'images/') || photo.src.startsWith('/images/')) && !photo.src.includes('..'));
    if (!safeLocal) throw new Error('unsafe-source');
    const original = await photoBytes(photo.src);
    const extension = original[0] === 0xff && original[1] === 0xd8 ? 'jpg' : original[0] === 0x89 ? 'png' : 'webp';
    const base = `${photo.date}_${photo.slot.replace(/[^a-z0-9_-]/gi, '')}_${index + 1}`;
    const name = `${base}.${extension}`;
    files.push({ name, bytes: withPhotoMetadata(original, photo) });
    files.push({ name: `${base}.txt`, bytes: encoder.encode(`Kakcal meal photo\nDate: ${photo.date}\nMeal: ${photo.slot}\nCreated: ${photo.createdAt}\n\n${photo.note}\n`) });
    csv.push([name, photo.date, photo.slot, photo.note, photo.createdAt].map(csvCell).join(','));
  }
  files.push({ name: 'meal-notes.csv', bytes: encoder.encode('\uFEFF' + csv.join('\r\n')) });
  files.push({ name: 'README.txt', bytes: encoder.encode('Kakcal photo diary export\n\nYour original stored pictures, named by date and meal. Notes are embedded as XMP descriptions in JPEG pictures. Each picture also has a matching .txt note, and meal-notes.csv opens in any spreadsheet. PNG/WebP notes are in these sidecars. Photos were resized and location/EXIF metadata removed when saved in Kakcal.\n\nFor a restorable app backup, also use Export data (JSON) in Settings. This ZIP is a readable photo export, not a journal restore file.\n') });
  return zip(files);
}