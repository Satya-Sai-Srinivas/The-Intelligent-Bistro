import { File } from 'expo-file-system';

/** Best-effort cleanup of a temp recording; never throws. */
export function deleteRecordingFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.warn('[deleteRecordingFile]', error);
  }
}
