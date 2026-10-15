/**
 * KOReader partial MD5 checksum algorithm
 * 
 * Used to match ebook progress records to Calibre books.
 * Samples 1024 bytes at exponentially spaced positions:
 * 0, 1024, 4096, 16384, 65536, 262144, 1048576, 4194304,
 * 16777216, 67108864, 268435456, 1073741824 bytes
 */

import * as fs from 'fs/promises';
import * as crypto from 'crypto';

const CHUNK_SIZE = 1024;

/**
 * Calculate partial MD5 hash of a file using KOReader's sampling algorithm.
 * 
 * Samples 1024 bytes at positions: 1024 << (2*i) for i = -1 to 10
 * For i=-1: position is 0 (due to LuaJIT bit shift overflow)
 * For i>=0: position is 1024 << (2*i)
 * 
 * @param filepath Path to the file
 * @returns 32-character hex MD5 hash, or null on error
 */
export async function calculateKoreaderPartialMD5(filepath: string): Promise<string | null> {
  try {
    const handle = await fs.open(filepath, 'r');
    const md5Hash = crypto.createHash('md5');
    
    // Sample at positions: 1024 << (2*i) for i = -1 to 10
    for (let i = -1; i <= 10; i++) {
      let position: number;
      if (i < 0) {
        position = 0;
      } else {
        // LuaJIT bit shift overflow behavior: mask to 32-bit unsigned
        position = (CHUNK_SIZE << (2 * i)) & 0xFFFFFFFF;
      }
      
      try {
        const buffer = Buffer.alloc(CHUNK_SIZE);
        const { bytesRead } = await handle.read(buffer, 0, CHUNK_SIZE, position);
        
        if (bytesRead > 0) {
          md5Hash.update(buffer.slice(0, bytesRead));
        } else {
          break; // EOF
        }
      } catch (error) {
        // Read error, stop sampling
        break;
      }
    }
    
    await handle.close();
    return md5Hash.digest('hex');
  } catch (error) {
    console.error('Error calculating checksum for', filepath, ':', error);
    return null;
  }
}
