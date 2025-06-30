import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

// Mock the fs module
var fs: {
    promises: {
        stat: Mock<() => Promise<any>>,
        access: Mock<() => Promise<void>>,
        mkdir: Mock<() => Promise<void>>,
        readFile: Mock<() => Promise<string>>,
        writeFile: Mock<() => Promise<void>>,
        lstatSync: Mock<() => Promise<any>>,
        readdir: Mock<() => Promise<string[]>>,
    },
    constants: {
        R_OK: number,
        W_OK: number
    },
    createReadStream: Mock<() => any>,
};

// Mock the fs module
const mockGlob = vi.fn<() => Promise<any>>();
const mockStat = vi.fn<() => Promise<any>>();
const mockAccess = vi.fn<() => Promise<void>>();
const mockMkdir = vi.fn<() => Promise<void>>();
const mockReadFile = vi.fn<() => Promise<string>>();
const mockWriteFile = vi.fn<() => Promise<void>>();
const mockLstatSync = vi.fn<() => Promise<any>>();
const mockReaddir = vi.fn<() => Promise<string[]>>();
const mockCreateReadStream = vi.fn<() => any>();

vi.mock('fs', () => ({
    __esModule: true,
    promises: {
        stat: mockStat,
        access: mockAccess,
        mkdir: mockMkdir,
        readFile: mockReadFile,
        writeFile: mockWriteFile,
        lstatSync: mockLstatSync,
        readdir: mockReaddir
    },
    constants: {
        R_OK: 4,
        W_OK: 2
    },
    createReadStream: mockCreateReadStream
}));

// Mock crypto module
const mockCrypto = {
    createHash: vi.fn(),
};

vi.mock('crypto', () => ({
    __esModule: true,
    default: mockCrypto,
    createHash: mockCrypto.createHash
}));

vi.mock('glob', () => ({
    __esModule: true,
    glob: mockGlob
}));

// Import the storage module after mocking fs
let storageModule: any;

describe('Storage Utility', () => {
    // Mock for console.log
    const mockLog = vi.fn();
    let storage: any;

    beforeAll(async () => {
        var fs = await import('fs');
        var glob = await import('glob');
        storageModule = await import('../../src/util/storage');
    });

    beforeEach(() => {
        vi.clearAllMocks();
        storage = storageModule.create({ log: mockLog });
    });

    describe('exists', () => {
        it('should return true if path exists', async () => {
            mockStat.mockResolvedValueOnce({ isDirectory: () => false, isFile: () => false });

            const result = await storage.exists('/test/path');

            expect(result).toBe(true);
            expect(mockStat).toHaveBeenCalledWith('/test/path');
        });

        it('should return false if path does not exist', async () => {
            mockStat.mockRejectedValueOnce(new Error('Path does not exist'));

            const result = await storage.exists('/test/path');

            expect(result).toBe(false);
            expect(mockStat).toHaveBeenCalledWith('/test/path');
        });
    });

    describe('isDirectory', () => {
        it('should return true if path is a directory', async () => {
            mockStat.mockResolvedValueOnce({
                isDirectory: () => true,
                isFile: () => false
            });

            const result = await storage.isDirectory('/test/dir');

            expect(result).toBe(true);
            expect(mockStat).toHaveBeenCalledWith('/test/dir');
            expect(mockLog).not.toHaveBeenCalled();
        });

        it('should return false if path is not a directory', async () => {
            mockStat.mockResolvedValueOnce({
                isDirectory: () => false,
                isFile: () => true
            });

            const result = await storage.isDirectory('/test/file');

            expect(result).toBe(false);
            expect(mockStat).toHaveBeenCalledWith('/test/file');
            expect(mockLog).toHaveBeenCalledWith('/test/file is not a directory');
        });
    });

    describe('isFile', () => {
        it('should return true if path is a file', async () => {
            mockStat.mockResolvedValueOnce({
                isFile: () => true,
                isDirectory: () => false
            });

            const result = await storage.isFile('/test/file.txt');

            expect(result).toBe(true);
            expect(mockStat).toHaveBeenCalledWith('/test/file.txt');
            expect(mockLog).not.toHaveBeenCalled();
        });

        it('should return false if path is not a file', async () => {
            mockStat.mockResolvedValueOnce({
                isFile: () => false,
                isDirectory: () => true
            });

            const result = await storage.isFile('/test/dir');

            expect(result).toBe(false);
            expect(mockStat).toHaveBeenCalledWith('/test/dir');
            expect(mockLog).toHaveBeenCalledWith('/test/dir is not a file');
        });
    });

    describe('isReadable', () => {
        it('should return true if path is readable', async () => {
            mockAccess.mockResolvedValueOnce(undefined);

            const result = await storage.isReadable('/test/file.txt');

            expect(result).toBe(true);
            expect(mockAccess).toHaveBeenCalledWith('/test/file.txt', 4);
        });

        it('should return false if path is not readable', async () => {
            mockAccess.mockRejectedValueOnce(new Error('Not readable'));

            const result = await storage.isReadable('/test/file.txt');

            expect(result).toBe(false);
            expect(mockAccess).toHaveBeenCalledWith('/test/file.txt', 4);
            expect(mockLog).toHaveBeenCalledWith(
                '/test/file.txt is not readable: %s %s',
                'Not readable',
                expect.any(String)
            );
        });
    });

    describe('isWritable', () => {
        it('should return true if path is writable', async () => {
            mockAccess.mockResolvedValueOnce(undefined);

            const result = await storage.isWritable('/test/file.txt');

            expect(result).toBe(true);
            expect(mockAccess).toHaveBeenCalledWith('/test/file.txt', 2);
        });

        it('should return false if path is not writable', async () => {
            mockAccess.mockRejectedValueOnce(new Error('Not writable'));

            const result = await storage.isWritable('/test/file.txt');

            expect(result).toBe(false);
            expect(mockAccess).toHaveBeenCalledWith('/test/file.txt', 2);
            expect(mockLog).toHaveBeenCalledWith(
                '/test/file.txt is not writable: %s %s',
                'Not writable',
                expect.any(String)
            );
        });
    });

    describe('isFileReadable', () => {
        it('should return true if path exists, is a file, and is readable', async () => {
            // Setup mocks for the chain of function calls
            mockStat.mockResolvedValueOnce({ isFile: () => false, isDirectory: () => false }); // exists
            mockStat.mockResolvedValueOnce({  // isFile
                isFile: () => true,
                isDirectory: () => false
            });
            mockAccess.mockResolvedValueOnce(undefined); // isReadable

            const result = await storage.isFileReadable('/test/file.txt');

            expect(result).toBe(true);
        });

        it('should return false if path does not exist', async () => {
            mockStat.mockRejectedValueOnce(new Error('Path does not exist'));

            const result = await storage.isFileReadable('/test/file.txt');

            expect(result).toBe(false);
        });

        it('should return false if path is not a file', async () => {
            mockStat.mockResolvedValueOnce({ isFile: () => false, isDirectory: () => false }); // exists
            mockStat.mockResolvedValueOnce({ // isFile
                isFile: () => false,
                isDirectory: () => true
            });

            const result = await storage.isFileReadable('/test/dir');

            expect(result).toBe(false);
        });

        it('should return false if path is not readable', async () => {
            mockStat.mockResolvedValueOnce({ isFile: () => false, isDirectory: () => false }); // exists
            mockStat.mockResolvedValueOnce({ // isFile
                isFile: () => true,
                isDirectory: () => false
            });
            mockAccess.mockRejectedValueOnce(new Error('Not readable')); // isReadable

            const result = await storage.isFileReadable('/test/file.txt');

            expect(result).toBe(false);
        });
    });

    describe('isDirectoryWritable', () => {
        it('should return true if path exists, is a directory, and is writable', async () => {
            // Setup mocks for the chain of function calls
            mockStat.mockResolvedValueOnce({ isFile: () => false, isDirectory: () => false }); // exists
            mockStat.mockResolvedValueOnce({ // isDirectory
                isDirectory: () => true,
                isFile: () => false
            });
            mockAccess.mockResolvedValueOnce(undefined); // isWritable

            const result = await storage.isDirectoryWritable('/test/dir');

            expect(result).toBe(true);
        });

        it('should return false if path does not exist', async () => {
            mockStat.mockRejectedValueOnce(new Error('Path does not exist'));

            const result = await storage.isDirectoryWritable('/test/dir');

            expect(result).toBe(false);
        });

        it('should return false if path is not a directory', async () => {
            mockStat.mockResolvedValueOnce({ isFile: () => false, isDirectory: () => false }); // exists
            mockStat.mockResolvedValueOnce({ // isDirectory
                isDirectory: () => false,
                isFile: () => true
            });

            const result = await storage.isDirectoryWritable('/test/file.txt');

            expect(result).toBe(false);
        });

        it('should return false if path is not writable', async () => {
            mockStat.mockResolvedValueOnce({ isFile: () => false, isDirectory: () => false }); // exists
            mockStat.mockResolvedValueOnce({ // isDirectory
                isDirectory: () => true,
                isFile: () => false
            });
            mockAccess.mockRejectedValueOnce(new Error('Not writable')); // isWritable

            const result = await storage.isDirectoryWritable('/test/dir');

            expect(result).toBe(false);
        });
    });

    describe('createDirectory', () => {
        it('should create directory successfully', async () => {
            mockMkdir.mockResolvedValueOnce(undefined);

            await storage.createDirectory('/test/dir');

            expect(mockMkdir).toHaveBeenCalledWith('/test/dir', { recursive: true });
        });

        it('should throw FileSystemError if directory creation fails', async () => {
            const originalError = new Error('Permission denied') as any;
            originalError.code = 'EACCES';
            mockMkdir.mockRejectedValueOnce(originalError);

            await expect(storage.createDirectory('/test/dir')).rejects.toThrow(
                'Failed to create directory: Permission denied'
            );

            expect(mockMkdir).toHaveBeenCalledWith('/test/dir', { recursive: true });
        });

        it('should handle EEXIST errors', async () => {
            const existsError = new Error('File exists') as any;
            existsError.code = 'EEXIST';
            mockMkdir.mockRejectedValueOnce(existsError);

            await expect(storage.createDirectory('/test/existing')).rejects.toThrow(
                'Failed to create directory: File exists'
            );
        });
    });

    describe('readFile', () => {
        it('should read file successfully', async () => {
            mockStat.mockResolvedValueOnce({
                size: 1024, // Mock file size
                isDirectory: () => false,
                isFile: () => true
            });
            mockReadFile.mockResolvedValueOnce('file content');

            const result = await storage.readFile('/test/file.txt', 'utf8');

            expect(result).toBe('file content');
            expect(mockStat).toHaveBeenCalledWith('/test/file.txt');
            expect(mockReadFile).toHaveBeenCalledWith('/test/file.txt', { encoding: 'utf8' });
        });

        it('should throw error for invalid encoding', async () => {
            await expect(storage.readFile('/test/file.txt', 'invalid-encoding')).rejects.toThrow(
                'Invalid encoding specified'
            );

            // Should not proceed to stat or readFile if encoding is invalid
            expect(mockStat).not.toHaveBeenCalled();
            expect(mockReadFile).not.toHaveBeenCalled();
        });

        it('should accept valid encodings (case insensitive)', async () => {
            mockStat.mockResolvedValue({
                size: 1024,
                isDirectory: () => false,
                isFile: () => true
            });
            mockReadFile.mockResolvedValue('content');

            // Test various valid encodings
            const validEncodings = ['UTF8', 'utf-8', 'ASCII', 'latin1', 'base64', 'hex', 'utf16le', 'ucs2', 'ucs-2'];

            for (const encoding of validEncodings) {
                await storage.readFile('/test/file.txt', encoding);
            }

            expect(mockStat).toHaveBeenCalledTimes(validEncodings.length);
            expect(mockReadFile).toHaveBeenCalledTimes(validEncodings.length);
        });

        it('should throw error for file too large', async () => {
            mockStat.mockResolvedValueOnce({
                size: 15 * 1024 * 1024, // 15MB - exceeds 10MB limit
                isDirectory: () => false,
                isFile: () => true
            });

            await expect(storage.readFile('/test/large-file.txt', 'utf8')).rejects.toThrow(
                'File too large to process'
            );

            expect(mockStat).toHaveBeenCalledWith('/test/large-file.txt');
            expect(mockReadFile).not.toHaveBeenCalled();
        });

        it('should throw FileSystemError for file not found (ENOENT)', async () => {
            const enoentError = new Error('ENOENT: no such file or directory') as any;
            enoentError.code = 'ENOENT';
            mockStat.mockRejectedValueOnce(enoentError);

            await expect(storage.readFile('/test/nonexistent.txt', 'utf8')).rejects.toThrow();

            expect(mockStat).toHaveBeenCalledWith('/test/nonexistent.txt');
            expect(mockReadFile).not.toHaveBeenCalled();
        });

        it('should re-throw non-ENOENT stat errors', async () => {
            const permissionError = new Error('Permission denied') as any;
            permissionError.code = 'EACCES';
            mockStat.mockRejectedValueOnce(permissionError);

            await expect(storage.readFile('/test/no-permission.txt', 'utf8')).rejects.toThrow(
                'Permission denied'
            );

            expect(mockStat).toHaveBeenCalledWith('/test/no-permission.txt');
            expect(mockReadFile).not.toHaveBeenCalled();
        });

        it('should handle readFile errors', async () => {
            mockStat.mockResolvedValueOnce({
                size: 1024,
                isDirectory: () => false,
                isFile: () => true
            });
            mockReadFile.mockRejectedValueOnce(new Error('Read error'));

            await expect(storage.readFile('/test/file.txt', 'utf8')).rejects.toThrow('Read error');

            expect(mockStat).toHaveBeenCalledWith('/test/file.txt');
            expect(mockReadFile).toHaveBeenCalledWith('/test/file.txt', { encoding: 'utf8' });
        });
    });

    describe('writeFile', () => {
        it('should write file successfully', async () => {
            mockWriteFile.mockResolvedValueOnce(undefined);

            await storage.writeFile('/test/file.txt', 'file content', 'utf8');

            expect(mockWriteFile).toHaveBeenCalledWith('/test/file.txt', 'file content', { encoding: 'utf8' });
        });

        it('should write file with Buffer data', async () => {
            mockWriteFile.mockResolvedValueOnce(undefined);
            const buffer = Buffer.from('file content');

            await storage.writeFile('/test/file.txt', buffer, 'utf8');

            expect(mockWriteFile).toHaveBeenCalledWith('/test/file.txt', buffer, { encoding: 'utf8' });
        });

        it('should handle write errors', async () => {
            mockWriteFile.mockRejectedValueOnce(new Error('Permission denied'));

            await expect(storage.writeFile('/test/file.txt', 'content', 'utf8')).rejects.toThrow(
                'Permission denied'
            );

            expect(mockWriteFile).toHaveBeenCalledWith('/test/file.txt', 'content', { encoding: 'utf8' });
        });

        it('should handle disk full errors', async () => {
            const diskFullError = new Error('ENOSPC: no space left on device') as any;
            diskFullError.code = 'ENOSPC';
            mockWriteFile.mockRejectedValueOnce(diskFullError);

            await expect(storage.writeFile('/test/file.txt', 'content', 'utf8')).rejects.toThrow(
                'ENOSPC: no space left on device'
            );
        });
    });

    describe('Default logger', () => {
        it('should use console.log as default logger', async () => {
            const originalConsoleLog = console.log;
            const mockConsoleLog = vi.fn();
            console.log = mockConsoleLog;

            try {
                const utilWithDefaultLogger = storageModule.create({});
                mockStat.mockResolvedValueOnce({
                    isDirectory: () => false,
                    isFile: () => true
                });

                await utilWithDefaultLogger.isDirectory('/test/file');

                expect(mockConsoleLog).toHaveBeenCalledWith('/test/file is not a directory');
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });

    describe('isDirectoryReadable', () => {
        it('should return true if path exists, is a directory, and is readable', async () => {
            // Setup mocks for the chain of function calls
            mockStat.mockResolvedValueOnce({ isFile: () => false, isDirectory: () => false }); // exists
            mockStat.mockResolvedValueOnce({ // isDirectory
                isDirectory: () => true,
                isFile: () => false
            });
            mockAccess.mockResolvedValueOnce(undefined); // isReadable

            const result = await storage.isDirectoryReadable('/test/dir');

            expect(result).toBe(true);
        });

        it('should return false if path does not exist', async () => {
            mockStat.mockRejectedValueOnce(new Error('Path does not exist'));

            const result = await storage.isDirectoryReadable('/test/dir');

            expect(result).toBe(false);
        });

        it('should return false if path is not a directory', async () => {
            mockStat.mockResolvedValueOnce({ isFile: () => false, isDirectory: () => false }); // exists
            mockStat.mockResolvedValueOnce({ // isDirectory
                isDirectory: () => false,
                isFile: () => true
            });

            const result = await storage.isDirectoryReadable('/test/file.txt');

            expect(result).toBe(false);
        });

        it('should return false if path is not readable', async () => {
            mockStat.mockResolvedValueOnce({ isFile: () => false, isDirectory: () => false }); // exists
            mockStat.mockResolvedValueOnce({ // isDirectory
                isDirectory: () => true,
                isFile: () => false
            });
            mockAccess.mockRejectedValueOnce(new Error('Not readable')); // isReadable

            const result = await storage.isDirectoryReadable('/test/dir');

            expect(result).toBe(false);
        });
    });

    describe('readStream', () => {
        it('should create and return a readable stream', async () => {
            const mockStream = { pipe: vi.fn() };
            mockCreateReadStream.mockReturnValueOnce(mockStream);

            const result = await storage.readStream('/test/file.txt');

            expect(result).toBe(mockStream);
            expect(mockCreateReadStream).toHaveBeenCalledWith('/test/file.txt');
        });
    });

    describe('hashFile', () => {
        it('should hash the file content correctly', async () => {
            const fileContent = 'test file content';
            const mockHash = {
                update: vi.fn().mockReturnThis(),
                digest: vi.fn().mockReturnValue('0123456789abcdef0123456789abcdef')
            };

            // Mock stat for file size check in readFile
            mockStat.mockResolvedValueOnce({
                size: 1024,
                isDirectory: () => false,
                isFile: () => true
            });
            mockReadFile.mockResolvedValueOnce(fileContent);
            mockCrypto.createHash.mockReturnValueOnce(mockHash);

            const result = await storage.hashFile('/test/file.txt', 10);

            expect(mockStat).toHaveBeenCalledWith('/test/file.txt');
            expect(mockReadFile).toHaveBeenCalledWith('/test/file.txt', { encoding: 'utf8' });
            expect(mockCrypto.createHash).toHaveBeenCalledWith('sha256');
            expect(mockHash.update).toHaveBeenCalledWith(fileContent);
            expect(mockHash.digest).toHaveBeenCalledWith('hex');
            expect(result).toBe('0123456789');
        });

        it('should handle different hash lengths', async () => {
            const mockHash = {
                update: vi.fn().mockReturnThis(),
                digest: vi.fn().mockReturnValue('abcdef1234567890abcdef1234567890')
            };

            mockStat.mockResolvedValueOnce({
                size: 512,
                isDirectory: () => false,
                isFile: () => true
            });
            mockReadFile.mockResolvedValueOnce('content');
            mockCrypto.createHash.mockReturnValueOnce(mockHash);

            const result = await storage.hashFile('/test/file.txt', 16);

            expect(result).toBe('abcdef1234567890');
            expect(result.length).toBe(16);
        });

        it('should handle zero length hash', async () => {
            const mockHash = {
                update: vi.fn().mockReturnThis(),
                digest: vi.fn().mockReturnValue('abcdef1234567890')
            };

            mockStat.mockResolvedValueOnce({
                size: 512,
                isDirectory: () => false,
                isFile: () => true
            });
            mockReadFile.mockResolvedValueOnce('content');
            mockCrypto.createHash.mockReturnValueOnce(mockHash);

            const result = await storage.hashFile('/test/file.txt', 0);

            expect(result).toBe('');
        });

        it('should propagate readFile errors', async () => {
            mockStat.mockResolvedValueOnce({
                size: 1024,
                isDirectory: () => false,
                isFile: () => true
            });
            mockReadFile.mockRejectedValueOnce(new Error('Read failed'));

            await expect(storage.hashFile('/test/file.txt', 10)).rejects.toThrow('Read failed');
        });
    });

    describe('listFiles', () => {
        it('should list files in a directory', async () => {
            mockReaddir.mockResolvedValueOnce(['file1.txt', 'file2.txt', 'subdirectory']);

            const result = await storage.listFiles('/test/dir');

            expect(result).toEqual(['file1.txt', 'file2.txt', 'subdirectory']);
            expect(mockReaddir).toHaveBeenCalledWith('/test/dir');
        });

        it('should throw error if reading directory fails', async () => {
            mockReaddir.mockRejectedValueOnce(new Error('Permission denied'));

            await expect(storage.listFiles('/test/dir')).rejects.toThrow();
            expect(mockReaddir).toHaveBeenCalledWith('/test/dir');
        });
    });

    describe('forEachFileIn', () => {
        it('should iterate over files in a directory', async () => {
            // Setup mocks for the chain of function calls
            // @ts-ignore
            mockGlob.mockResolvedValueOnce(['file1.txt', 'file2.txt']);

            const callbackFn = vi.fn();
            await storage.forEachFileIn('/test/dir', callbackFn);

            expect(callbackFn).toHaveBeenCalledTimes(2);
            expect(callbackFn).toHaveBeenCalledWith('/test/dir/file1.txt');
            expect(callbackFn).toHaveBeenCalledWith('/test/dir/file2.txt');
        });

        it('should handle custom glob patterns', async () => {
            // @ts-ignore
            mockGlob.mockResolvedValueOnce(['doc1.pdf', 'doc2.pdf']);

            const callbackFn = vi.fn();
            await storage.forEachFileIn('/test/dir', callbackFn, { pattern: '*.pdf' });

            expect(mockGlob).toHaveBeenCalledWith('*.pdf', expect.objectContaining({ cwd: '/test/dir' }));
            expect(callbackFn).toHaveBeenCalledTimes(2);
        });

        it('should handle array patterns', async () => {
            // @ts-ignore
            mockGlob.mockResolvedValueOnce(['file1.js', 'file2.ts', 'file3.json']);

            const callbackFn = vi.fn();
            await storage.forEachFileIn('/test/dir', callbackFn, { pattern: ['*.js', '*.ts'] });

            expect(mockGlob).toHaveBeenCalledWith(['*.js', '*.ts'], expect.objectContaining({ cwd: '/test/dir' }));
            expect(callbackFn).toHaveBeenCalledTimes(3);
        });

        it('should use default pattern when no options provided', async () => {
            // @ts-ignore
            mockGlob.mockResolvedValueOnce(['file1.txt', 'file2.doc']);

            const callbackFn = vi.fn();
            await storage.forEachFileIn('/test/dir', callbackFn);

            expect(mockGlob).toHaveBeenCalledWith('*.*', expect.objectContaining({
                cwd: '/test/dir',
                nodir: true
            }));
        });

        it('should handle empty glob results', async () => {
            // @ts-ignore
            mockGlob.mockResolvedValueOnce([]);

            const callbackFn = vi.fn();
            await storage.forEachFileIn('/test/dir', callbackFn);

            expect(callbackFn).not.toHaveBeenCalled();
        });

        it('should handle callback errors', async () => {
            // @ts-ignore
            mockGlob.mockResolvedValueOnce(['file1.txt']);

            const callbackFn = vi.fn().mockRejectedValueOnce(new Error('Callback failed'));

            await expect(storage.forEachFileIn('/test/dir', callbackFn)).rejects.toThrow('Callback failed');

            expect(callbackFn).toHaveBeenCalledTimes(1);
        });

        it('should throw error if glob fails', async () => {
            mockGlob.mockRejectedValueOnce(new Error('Glob error'));

            const callbackFn = vi.fn();
            await expect(storage.forEachFileIn('/test/dir', callbackFn)).rejects.toThrow(
                'Failed to glob pattern *.*'
            );

            expect(callbackFn).not.toHaveBeenCalled();
        });

        it('should handle glob permission errors', async () => {
            const permissionError = new Error('Permission denied') as any;
            permissionError.code = 'EACCES';
            mockGlob.mockRejectedValueOnce(permissionError);

            const callbackFn = vi.fn();
            await expect(storage.forEachFileIn('/test/restricted', callbackFn)).rejects.toThrow(
                'Failed to glob pattern *.*'
            );
        });
    });

    describe('Error handling for stat-dependent methods', () => {
        describe('isDirectory', () => {
            it('should handle stat errors', async () => {
                mockStat.mockRejectedValueOnce(new Error('Permission denied'));

                await expect(storage.isDirectory('/test/restricted')).rejects.toThrow('Permission denied');
                expect(mockStat).toHaveBeenCalledWith('/test/restricted');
            });
        });

        describe('isFile', () => {
            it('should handle stat errors', async () => {
                mockStat.mockRejectedValueOnce(new Error('Permission denied'));

                await expect(storage.isFile('/test/restricted')).rejects.toThrow('Permission denied');
                expect(mockStat).toHaveBeenCalledWith('/test/restricted');
            });
        });
    });

    describe('Edge cases and additional scenarios', () => {
        it('should handle empty file content in hashFile', async () => {
            const mockHash = {
                update: vi.fn().mockReturnThis(),
                digest: vi.fn().mockReturnValue('e3b0c44298fc1c149afbf4c8996fb924')
            };

            mockStat.mockResolvedValueOnce({
                size: 0,
                isDirectory: () => false,
                isFile: () => true
            });
            mockReadFile.mockResolvedValueOnce('');
            mockCrypto.createHash.mockReturnValueOnce(mockHash);

            const result = await storage.hashFile('/test/empty.txt', 8);

            expect(mockHash.update).toHaveBeenCalledWith('');
            expect(result).toBe('e3b0c442');
        });

        it('should handle very small files in readFile', async () => {
            mockStat.mockResolvedValueOnce({
                size: 1, // 1 byte file
                isDirectory: () => false,
                isFile: () => true
            });
            mockReadFile.mockResolvedValueOnce('a');

            const result = await storage.readFile('/test/tiny.txt', 'utf8');

            expect(result).toBe('a');
        });

        it('should handle exactly maximum file size in readFile', async () => {
            mockStat.mockResolvedValueOnce({
                size: 10 * 1024 * 1024, // Exactly 10MB
                isDirectory: () => false,
                isFile: () => true
            });
            mockReadFile.mockResolvedValueOnce('large content');

            const result = await storage.readFile('/test/max-size.txt', 'utf8');

            expect(result).toBe('large content');
        });

        it('should handle special characters in paths', async () => {
            mockStat.mockResolvedValueOnce({
                size: 100,
                isDirectory: () => false,
                isFile: () => true
            });
            mockReadFile.mockResolvedValueOnce('content');

            const specialPath = '/test/file with spaces & symbols!@#$.txt';
            const result = await storage.readFile(specialPath, 'utf8');

            expect(result).toBe('content');
            expect(mockStat).toHaveBeenCalledWith(specialPath);
            expect(mockReadFile).toHaveBeenCalledWith(specialPath, { encoding: 'utf8' });
        });
    });
});
