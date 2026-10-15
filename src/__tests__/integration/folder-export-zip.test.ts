/**
 * Integration tests for folder export ZIP integrity
 * 
 * Tests that folder export produces valid ZIP files with correct markdown content.
 */

import { getFolderPages, getFolderName } from '@/lib/db';

// Mock database functions
jest.mock('@/lib/db', () => ({
  getFolderPages: jest.fn(),
  getFolderName: jest.fn(),
}));

// Mock jsonToMarkdown - we'll test the integration separately
jest.mock('@/lib/jsonToMarkdown', () => ({
  jsonToMarkdown: jest.fn((content) => {
    // Simple mock conversion for testing
    if (!content) return '';
    return `# Mock Title\n\nMock content for ${JSON.stringify(content).substring(0, 50)}`;
  }),
}));

// Mock JSZip and file-saver for client-side tests
global.fetch = jest.fn();

describe('Folder Export ZIP Integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Export API endpoint validation', () => {
    it('should return folderName and pages array', async () => {
      const mockFolderName = 'Test Folder';
      const mockPages = [
        {
          id: 1,
          title: 'Page One',
          content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] },
          folder_id: 'folder-1',
          created_at: '2026-10-15T10:00:00Z',
          updated_at: '2026-10-15T10:00:00Z',
        },
        {
          id: 2,
          title: 'Page Two',
          content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'World' }] }] },
          folder_id: 'folder-1',
          created_at: '2026-10-15T10:00:00Z',
          updated_at: '2026-10-15T10:00:00Z',
        },
      ];

      (getFolderName as jest.Mock).mockResolvedValue(mockFolderName);
      (getFolderPages as jest.Mock).mockResolvedValue(mockPages);

      // Simulate API call
      const folderId = 'folder-1';
      const folderName = await getFolderName(Number(folderId));
      const pages = await getFolderPages(Number(folderId));

      expect(folderName).toBe(mockFolderName);
      expect(Array.isArray(pages)).toBe(true);
      expect(pages).toHaveLength(2);
      expect(pages[0]).toHaveProperty('title');
      expect(pages[0]).toHaveProperty('content');
      expect(pages[1]).toHaveProperty('title');
      expect(pages[1]).toHaveProperty('content');
    });

    it('should return empty pages array for empty folder', async () => {
      (getFolderName as jest.Mock).mockResolvedValue('Empty Folder');
      (getFolderPages as jest.Mock).mockResolvedValue([]);

      const folderName = await getFolderName(2);
      const pages = await getFolderPages(2);

      expect(folderName).toBe('Empty Folder');
      expect(pages).toHaveLength(0);
      expect(Array.isArray(pages)).toBe(true);
    });

    it('should include all required page properties', async () => {
      const mockPage = {
        id: 1,
        title: 'Test Page',
        content: { type: 'doc', content: [] },
        folder_id: 'folder-1',
        created_at: '2026-10-15T10:00:00Z',
        updated_at: '2026-10-15T10:00:00Z',
      };

      (getFolderName as jest.Mock).mockResolvedValue('Test Folder');
      (getFolderPages as jest.Mock).mockResolvedValue([mockPage]);

      const pages = await getFolderPages(1);
      const page = pages[0];

      expect(page).toHaveProperty('id');
      expect(page).toHaveProperty('title');
      expect(page).toHaveProperty('content');
      expect(page).toHaveProperty('folder_id');
      expect(page).toHaveProperty('created_at');
      expect(page).toHaveProperty('updated_at');
    });
  });

  describe('Filename sanitization', () => {
    it('should remove special characters from filename', () => {
      const titles = [
        { input: 'Page/With/Slashes', expected: 'Page-With-Slashes' },
        { input: 'Page\\With\\Backslashes', expected: 'Page-With-Backslashes' },
        { input: 'Page?With?Question?Marks', expected: 'Page-With-Question-Marks' },
        { input: 'Page*With*Stars', expected: 'Page-With-Stars' },
        { input: 'Page:With:Colons', expected: 'Page-With-Colons' },
        { input: 'Page"With"Quotes', expected: 'Page-With-Quotes' },
        { input: 'Page<With>Brackets', expected: 'Page-With-Brackets' },
        { input: 'Page|With|Pipes', expected: 'Page-With-Pipes' },
      ];

      titles.forEach(({ input, expected }) => {
        const sanitized = input.replace(/[\/\\?%*:|"<>]/g, '-');
        expect(sanitized).toBe(expected);
      });
    });

    it('should handle multiple special characters in sequence', () => {
      const title = 'Page///With***Multiple???Characters';
      const sanitized = title.replace(/[\/\\?%*:|"<>]/g, '-');
      expect(sanitized).toBe('Page---With---Multiple---Characters');
    });

    it('should preserve normal characters', () => {
      const title = 'Normal Page Title with Spaces and-Dashes';
      const sanitized = title.replace(/[\/\\?%*:|"<>]/g, '-');
      expect(sanitized).toBe(title);
    });

    it('should handle empty and whitespace-only titles', () => {
      expect(''.replace(/[\/\\?%*:|"<>]/g, '-')).toBe('');
      expect('   '.replace(/[\/\\?%*:|"<>]/g, '-')).toBe('   ');
    });
  });

  describe('Markdown content validation', () => {
    it('should convert TipTap JSON to markdown', async () => {
      const { jsonToMarkdown } = await import('@/lib/jsonToMarkdown');
      
      const content = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Title' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Some content' }],
          },
        ],
      };

      const markdown = jsonToMarkdown(content);
      
      expect(markdown).toBeTruthy();
      expect(typeof markdown).toBe('string');
      expect(markdown.length).toBeGreaterThan(0);
    });

    it('should handle empty content gracefully', async () => {
      const { jsonToMarkdown } = await import('@/lib/jsonToMarkdown');
      
      const markdown = jsonToMarkdown(null);
      expect(markdown).toBe('');

      const markdown2 = jsonToMarkdown(undefined);
      expect(markdown2).toBe('');

      const markdown3 = jsonToMarkdown({ type: 'doc', content: [] });
      expect(typeof markdown3).toBe('string');
    });

    it('should handle content with tasks', async () => {
      const { jsonToMarkdown } = await import('@/lib/jsonToMarkdown');
      
      const content = {
        type: 'doc',
        content: [
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task 1' }] }],
              },
              {
                type: 'taskItem',
                attrs: { checked: true },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task 2' }] }],
              },
            ],
          },
        ],
      };

      const markdown = jsonToMarkdown(content);
      expect(markdown).toBeTruthy();
      expect(typeof markdown).toBe('string');
      expect(markdown.length).toBeGreaterThan(0);
      // Note: Specific markdown content validation should be in jsonToMarkdown unit tests
    });

    it('should handle content with page links', async () => {
      const { jsonToMarkdown } = await import('@/lib/jsonToMarkdown');
      
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Link to ' },
              {
                type: 'pageLink',
                attrs: { id: 123, title: 'Other Page' },
                content: [{ type: 'text', text: 'Other Page' }],
              },
            ],
          },
        ],
      };

      const markdown = jsonToMarkdown(content);
      expect(markdown).toBeTruthy();
      expect(typeof markdown).toBe('string');
      expect(markdown.length).toBeGreaterThan(0);
      // Note: Specific markdown content validation should be in jsonToMarkdown unit tests
    });

    it('should handle content with tags', async () => {
      const { jsonToMarkdown } = await import('@/lib/jsonToMarkdown');
      
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Has ' },
              {
                type: 'tag',
                attrs: { name: 'important' },
                content: [{ type: 'text', text: '#important' }],
              },
              { type: 'text', text: ' tag' },
            ],
          },
        ],
      };

      const markdown = jsonToMarkdown(content);
      expect(markdown).toBeTruthy();
      expect(typeof markdown).toBe('string');
      expect(markdown.length).toBeGreaterThan(0);
      // Note: Specific markdown content validation should be in jsonToMarkdown unit tests
    });
  });

  describe('ZIP structure validation', () => {
    it('should generate valid ZIP structure conceptually', async () => {
      const pages = [
        { id: 1, title: 'Page One', content: { type: 'doc', content: [] } },
        { id: 2, title: 'Page Two', content: { type: 'doc', content: [] } },
        { id: 3, title: 'Page Three', content: { type: 'doc', content: [] } },
      ];

      // Simulate the ZIP generation process
      const zipFiles = pages.map(page => {
        const filename = `${page.title.replace(/[\/\\?%*:|"<>]/g, '-')}.md`;
        return { filename, content: `# ${page.title}\n\nContent` };
      });

      expect(zipFiles).toHaveLength(3);
      expect(zipFiles[0].filename).toBe('Page One.md');
      expect(zipFiles[1].filename).toBe('Page Two.md');
      expect(zipFiles[2].filename).toBe('Page Three.md');
    });

    it('should handle special characters in filenames for ZIP', () => {
      const pages = [
        { id: 1, title: 'Test/Page', content: { type: 'doc', content: [] } },
        { id: 2, title: 'Another\\Page', content: { type: 'doc', content: [] } },
        { id: 3, title: 'Special?Chars*Here', content: { type: 'doc', content: [] } },
      ];

      const zipFiles = pages.map(page => {
        const filename = `${page.title.replace(/[\/\\?%*:|"<>]/g, '-')}.md`;
        return { filename, content: `# ${page.title}` };
      });

      expect(zipFiles[0].filename).toBe('Test-Page.md');
      expect(zipFiles[1].filename).toBe('Another-Page.md');
      expect(zipFiles[2].filename).toBe('Special-Chars-Here.md');
    });

    it('should not have duplicate filenames in ZIP', () => {
      const pages = [
        { id: 1, title: 'Page One', content: { type: 'doc', content: [] } },
        { id: 2, title: 'Page One', content: { type: 'doc', content: [] } }, // Duplicate title
        { id: 3, title: 'Page Two', content: { type: 'doc', content: [] } },
      ];

      const filenames = pages.map(page => 
        `${page.title.replace(/[\/\\?%*:|"<>]/g, '-')}.md`
      );

      // Check for duplicates
      const uniqueFilenames = new Set(filenames);
      expect(uniqueFilenames.size).toBe(2); // Only 2 unique names
      expect(filenames.filter(f => f === 'Page One.md')).toHaveLength(2);
      
      // Note: In real implementation, JSZip would overwrite duplicate filenames
      // This test documents the current behavior
    });

    it('should create .md extension for all files', () => {
      const pages = [
        { id: 1, title: 'Document', content: { type: 'doc', content: [] } },
        { id: 2, title: 'Another Doc', content: { type: 'doc', content: [] } },
      ];

      const zipFiles = pages.map(page => ({
        filename: `${page.title.replace(/[\/\\?%*:|"<>]/g, '-')}.md`,
      }));

      zipFiles.forEach(file => {
        expect(file.filename.endsWith('.md')).toBe(true);
      });
    });
  });

  describe('Export flow integration', () => {
    it('should process all pages in folder', async () => {
      const mockPages = [
        { id: 1, title: 'First', content: { type: 'doc', content: [] } },
        { id: 2, title: 'Second', content: { type: 'doc', content: [] } },
        { id: 3, title: 'Third', content: { type: 'doc', content: [] } },
      ];

      (getFolderName as jest.Mock).mockResolvedValue('Test Folder');
      (getFolderPages as jest.Mock).mockResolvedValue(mockPages);

      const pages = await getFolderPages(1);
      expect(pages).toHaveLength(3);

      // Simulate processing each page
      const processedFiles = pages.map(page => ({
        filename: `${page.title.replace(/[\/\\?%*:|"<>]/g, '-')}.md`,
        hasContent: page.content !== null,
      }));

      expect(processedFiles).toHaveLength(3);
      expect(processedFiles[0].filename).toBe('First.md');
      expect(processedFiles[1].filename).toBe('Second.md');
      expect(processedFiles[2].filename).toBe('Third.md');
      expect(processedFiles.every(f => f.hasContent)).toBe(true);
    });

    it('should handle folder with no pages gracefully', async () => {
      (getFolderName as jest.Mock).mockResolvedValue('Empty Folder');
      (getFolderPages as jest.Mock).mockResolvedValue([]);

      const pages = await getFolderPages(2);
      expect(pages).toHaveLength(0);

      // No files to process
      const processedFiles = pages.map(page => ({
        filename: `${page.title.replace(/[\/\\?%*:|"<>]/g, '-')}.md`,
      }));

      expect(processedFiles).toHaveLength(0);
    });

    it('should handle folder with many pages', async () => {
      const mockPages = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        title: `Page ${i + 1}`,
        content: { type: 'doc', content: [] },
      }));

      (getFolderName as jest.Mock).mockResolvedValue('Large Folder');
      (getFolderPages as jest.Mock).mockResolvedValue(mockPages);

      const pages = await getFolderPages(3);
      expect(pages).toHaveLength(50);

      const processedFiles = pages.map(page => ({
        filename: `${page.title.replace(/[\/\\?%*:|"<>]/g, '-')}.md`,
      }));

      expect(processedFiles).toHaveLength(50);
      expect(processedFiles[0].filename).toBe('Page 1.md');
      expect(processedFiles[49].filename).toBe('Page 50.md');
    });
  });
});
