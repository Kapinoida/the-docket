import { syncCalibreWebEbooks, CalibreBook } from '@/media/lib/database';
import pool from '@/lib/db';

// Mock the database pool
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
    query: jest.fn(),
  },
}));

describe('syncCalibreWebEbooks', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create new ebooks on first sync', async () => {
    const books: CalibreBook[] = [
      {
        calibre_id: 1,
        title: 'Test Book',
        authors: ['Author One'],
        series: 'Test Series',
        series_index: 1,
        pubdate: '2023-01-01',
        tags: ['fiction', 'test'],
        comments: 'Test description',
        cover_url: '/api/v2/media/covers/calibre-web/1',
        book_path: 'Author One/Test Book',
        formats: [{ format: 'EPUB', size: 1024, path: 'book.epub', checksum: 'abc123' }],
        checksums: ['abc123'],
        progress: null,
      },
    ];

    // Mock calls in order:
    // 1. BEGIN
    mockClient.query.mockResolvedValueOnce({});
    // 2. Query existing items
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 3. Query if book exists
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 4. Insert new book
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 100 }] });
    // 5. Create source link
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 6. COMMIT
    mockClient.query.mockResolvedValueOnce({});

    const result = await syncCalibreWebEbooks(books, true);

    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.deleted).toBe(0);
    expect(result.total).toBe(1);
    expect(result.books_with_progress).toBe(0);

    // Verify BEGIN transaction
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    // Verify COMMIT
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    // Verify client released
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should update existing ebooks', async () => {
    const books: CalibreBook[] = [
      {
        calibre_id: 1,
        title: 'Updated Book',
        authors: ['Updated Author'],
        series: 'Updated Series',
        series_index: 2,
        pubdate: '2024-01-01',
        tags: ['updated'],
        comments: 'Updated description',
        cover_url: '/api/v2/media/covers/calibre-web/1',
        book_path: 'Updated Author/Updated Book',
        formats: [{ format: 'PDF', size: 2048, path: 'book.pdf', checksum: 'def456' }],
        checksums: ['def456'],
        progress: { percentage: 0.5, device: 'Kindle', timestamp: '2024-10-15T10:00:00Z' },
      },
    ];

    // Mock calls in order:
    // 1. BEGIN
    mockClient.query.mockResolvedValueOnce({});
    // 2. Query existing items
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 100, external_id: '1' }] });
    // 3. Query if book exists (returns the existing item)
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 100 }] });
    // 4. Update existing book
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 5. COMMIT
    mockClient.query.mockResolvedValueOnce({});

    const result = await syncCalibreWebEbooks(books, true);

    expect(result.created).toBe(0);
    expect(result.updated).toBe(1);
    expect(result.books_with_progress).toBe(1);
  });

  it('should mark missing items as deleted when scan_complete is true', async () => {
    const books: CalibreBook[] = [
      {
        calibre_id: 2,
        title: 'New Book',
        authors: ['Author'],
        series: null,
        series_index: null,
        pubdate: null,
        tags: [],
        comments: null,
        cover_url: '/api/v2/media/covers/calibre-web/2',
        book_path: 'Author/New Book',
        formats: [],
        checksums: [],
        progress: null,
      },
    ];

    // Mock calls in order:
    // 1. BEGIN
    mockClient.query.mockResolvedValueOnce({});
    // 2. Query existing items (items 1 and 2 exist)
    mockClient.query.mockResolvedValueOnce({ 
      rows: [
        { id: 100, external_id: '1' },
        { id: 101, external_id: '2' },
      ],
    });
    // 3. Delete items not in sync (item 1)
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 4. Delete source links for item 1
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 5. Query if book 2 exists
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 6. Insert new book 2
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 102 }] });
    // 7. Create source link
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 8. COMMIT
    mockClient.query.mockResolvedValueOnce({});

    const result = await syncCalibreWebEbooks(books, true);

    expect(result.created).toBe(1);
    expect(result.deleted).toBe(1);
  });

  it('should not delete items when scan_complete is false', async () => {
    const books: CalibreBook[] = [
      {
        calibre_id: 2,
        title: 'New Book',
        authors: ['Author'],
        series: null,
        series_index: null,
        pubdate: null,
        tags: [],
        comments: null,
        cover_url: '/api/v2/media/covers/calibre-web/2',
        book_path: 'Author/New Book',
        formats: [],
        checksums: [],
        progress: null,
      },
    ];

    // Mock calls in order:
    // 1. BEGIN
    mockClient.query.mockResolvedValueOnce({});
    // 2. Query existing items
    mockClient.query.mockResolvedValueOnce({ 
      rows: [
        { id: 100, external_id: '1' },
        { id: 101, external_id: '2' },
      ],
    });
    // 3. Query if book 2 exists
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 4. Insert new book 2
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 102 }] });
    // 5. Create source link
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 6. COMMIT
    mockClient.query.mockResolvedValueOnce({});

    const result = await syncCalibreWebEbooks(books, false);

    expect(result.deleted).toBe(0);
    // Verify delete query was NOT called
    const calls = mockClient.query.mock.calls;
    const deleteCalls = calls.filter((call: any[]) => 
      typeof call[0] === 'string' && call[0].includes('source_deleted_at = NOW()')
    );
    expect(deleteCalls.length).toBe(0);
  });

  it('should rollback on error', async () => {
    const books: CalibreBook[] = [
      {
        calibre_id: 1,
        title: 'Test Book',
        authors: ['Author'],
        series: null,
        series_index: null,
        pubdate: null,
        tags: [],
        comments: null,
        cover_url: '/api/v2/media/covers/calibre-web/1',
        book_path: 'Author/Test Book',
        formats: [],
        checksums: [],
        progress: null,
      },
    ];

    // Mock calls in order:
    // 1. BEGIN
    mockClient.query.mockResolvedValueOnce({});
    // 2. Query existing items
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 3. Query if book exists
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 4. Insert fails
    mockClient.query.mockRejectedValueOnce(new Error('Database error'));

    await expect(syncCalibreWebEbooks(books, true)).rejects.toThrow('Database error');

    // Verify rollback was called
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should map progress correctly', async () => {
    const books: CalibreBook[] = [
      {
        calibre_id: 1,
        title: 'Book 0%',
        authors: ['Author'],
        series: null,
        series_index: null,
        pubdate: null,
        tags: [],
        comments: null,
        cover_url: '/api/v2/media/covers/calibre-web/1',
        book_path: 'Author/Book',
        formats: [],
        checksums: [],
        progress: { percentage: 0, device: null, timestamp: null },
      },
      {
        calibre_id: 2,
        title: 'Book 50%',
        authors: ['Author'],
        series: null,
        series_index: null,
        pubdate: null,
        tags: [],
        comments: null,
        cover_url: '/api/v2/media/covers/calibre-web/2',
        book_path: 'Author/Book2',
        formats: [],
        checksums: [],
        progress: { percentage: 0.5, device: 'Kindle', timestamp: '2024-10-15T10:00:00Z' },
      },
      {
        calibre_id: 3,
        title: 'Book 100%',
        authors: ['Author'],
        series: null,
        series_index: null,
        pubdate: null,
        tags: [],
        comments: null,
        cover_url: '/api/v2/media/covers/calibre-web/3',
        book_path: 'Author/Book3',
        formats: [],
        checksums: [],
        progress: { percentage: 1, device: 'Kobo', timestamp: '2024-10-15T12:00:00Z' },
      },
    ];

    // Mock calls in order:
    // 1. BEGIN
    mockClient.query.mockResolvedValueOnce({});
    // 2. Query existing items (none exist)
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    
    // For each of 3 books:
    // 3. Query if book 1 exists
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 4. Insert book 1
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 100 }] });
    // 5. Create source link for book 1
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 6. Query if book 2 exists
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 7. Insert book 2
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 101 }] });
    // 8. Create source link for book 2
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 9. Query if book 3 exists
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 10. Insert book 3
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 102 }] });
    // 11. Create source link for book 3
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 12. COMMIT
    mockClient.query.mockResolvedValueOnce({});

    const result = await syncCalibreWebEbooks(books, true);

    expect(result.books_with_progress).toBe(3);
  });
});
