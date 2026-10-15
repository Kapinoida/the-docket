import { calculateKoreaderPartialMD5 } from '@/media/lib/koreader';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('KOReader checksum algorithm', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'koreader-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should return null for non-existent file', async () => {
    const result = await calculateKoreaderPartialMD5('/nonexistent/file.txt');
    expect(result).toBeNull();
  });

  it('should return MD5 hash for empty file', async () => {
    const filePath = path.join(testDir, 'empty.txt');
    await fs.writeFile(filePath, '');
    
    const result = await calculateKoreaderPartialMD5(filePath);
    
    expect(result).not.toBeNull();
    expect(result).toMatch(/^[a-f0-9]{32}$/);
  });

  it('should return MD5 hash for small file', async () => {
    const filePath = path.join(testDir, 'small.txt');
    const content = 'Hello, world!';
    await fs.writeFile(filePath, content);
    
    const result = await calculateKoreaderPartialMD5(filePath);
    
    expect(result).not.toBeNull();
    expect(result).toMatch(/^[a-f0-9]{32}$/);
  });

  it('should return consistent hash for same content', async () => {
    const filePath1 = path.join(testDir, 'file1.txt');
    const filePath2 = path.join(testDir, 'file2.txt');
    const content = 'Same content in both files';
    
    await fs.writeFile(filePath1, content);
    await fs.writeFile(filePath2, content);
    
    const result1 = await calculateKoreaderPartialMD5(filePath1);
    const result2 = await calculateKoreaderPartialMD5(filePath2);
    
    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();
    expect(result1).toBe(result2);
  });

  it('should return different hash for different content', async () => {
    const filePath1 = path.join(testDir, 'file1.txt');
    const filePath2 = path.join(testDir, 'file2.txt');
    
    await fs.writeFile(filePath1, 'Content A');
    await fs.writeFile(filePath2, 'Content B');
    
    const result1 = await calculateKoreaderPartialMD5(filePath1);
    const result2 = await calculateKoreaderPartialMD5(filePath2);
    
    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();
    expect(result1).not.toBe(result2);
  });

  it('should handle large files', async () => {
    const filePath = path.join(testDir, 'large.txt');
    // Create a 2MB file
    const content = Buffer.alloc(2 * 1024 * 1024, 'x');
    await fs.writeFile(filePath, content);
    
    const result = await calculateKoreaderPartialMD5(filePath);
    
    expect(result).not.toBeNull();
    expect(result).toMatch(/^[a-f0-9]{32}$/);
  });

  it('should handle files at chunk boundaries', async () => {
    const filePath = path.join(testDir, 'boundary.txt');
    // Create a file exactly at 1024 bytes (first chunk size)
    const content = Buffer.alloc(1024, 'y');
    await fs.writeFile(filePath, content);
    
    const result = await calculateKoreaderPartialMD5(filePath);
    
    expect(result).not.toBeNull();
    expect(result).toMatch(/^[a-f0-9]{32}$/);
  });

  it('should handle binary files', async () => {
    const filePath = path.join(testDir, 'binary.bin');
    const content = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe, 0xfd]);
    await fs.writeFile(filePath, content);
    
    const result = await calculateKoreaderPartialMD5(filePath);
    
    expect(result).not.toBeNull();
    expect(result).toMatch(/^[a-f0-9]{32}$/);
  });
});
