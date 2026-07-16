/**
 * Pure JavaScript Base64 encoder compatible with React Native / Expo.
 * Encodes a string into Base64 format.
 */
export function base64Encode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  
  while (i < str.length) {
    const char1 = str.charCodeAt(i++);
    const char2 = i < str.length ? str.charCodeAt(i++) : NaN;
    const char3 = i < str.length ? str.charCodeAt(i++) : NaN;

    const byte1 = char1 >> 2;
    const byte2 = ((char1 & 3) << 4) | (isNaN(char2) ? 0 : char2 >> 4);
    const byte3 = isNaN(char2) ? 64 : ((char2 & 15) << 2) | (isNaN(char3) ? 0 : char3 >> 6);
    const byte4 = isNaN(char3) ? 64 : char3 & 63;

    result += chars.charAt(byte1) +
              chars.charAt(byte2) +
              (byte3 === 64 ? '=' : chars.charAt(byte3)) +
              (byte4 === 64 ? '=' : chars.charAt(byte4));
  }
  
  return result;
}
