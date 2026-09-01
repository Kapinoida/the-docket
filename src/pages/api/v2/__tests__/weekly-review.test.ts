import handler from '@/pages/api/v2/weekly-review';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getJournalPage, upsertJournalContent, createJournalPage } from '@/lib/db';

jest.mock('@/lib/db');

const mockGetJournalPage = getJournalPage as jest.MockedFunction<typeof getJournalPage>;
const mockUpsertJournalContent = upsertJournalContent as jest.MockedFunction<typeof upsertJournalContent>;
const mockCreateJournalPage = createJournalPage as jest.MockedFunction<typeof createJournalPage>;

function createMockReqRes(method: string, body: any = {}): { req: NextApiRequest; res: NextApiResponse } {
  const req = {
    method,
    body,
  } as NextApiRequest;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    end: jest.fn(),
  } as unknown as NextApiResponse;

  return { req, res };
}

describe('POST /api/v2/weekly-review', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 405 for non-POST methods', async () => {
    const { req, res } = createMockReqRes('GET');
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 400 for invalid content', async () => {
    const { req, res } = createMockReqRes('POST', {});
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for content without content array', async () => {
    const { req, res } = createMockReqRes('POST', { content: {} });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates journal page if it does not exist', async () => {
    mockGetJournalPage.mockResolvedValue(null);
    mockCreateJournalPage.mockResolvedValue({ id: 1, content: { type: 'doc', content: [] } });
    mockUpsertJournalContent.mockResolvedValue();

    const { req, res } = createMockReqRes('POST', {
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
    });
    await handler(req, res);

    expect(mockCreateJournalPage).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('appends review content to existing journal', async () => {
    const existingContent = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Existing' }] }],
    };
    mockGetJournalPage.mockResolvedValue({ id: 1, content: existingContent });
    mockUpsertJournalContent.mockResolvedValue();

    const { req, res } = createMockReqRes('POST', {
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Review' }] }] },
    });
    await handler(req, res);

    expect(mockUpsertJournalContent).toHaveBeenCalledWith(1, expect.objectContaining({
      type: 'doc',
      content: expect.arrayContaining([
        expect.objectContaining({ type: 'heading' }),
        expect.objectContaining({ type: 'paragraph', content: [{ type: 'text', text: 'Review' }] }),
      ]),
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 500 on database error', async () => {
    mockGetJournalPage.mockRejectedValue(new Error('DB error'));

    const { req, res } = createMockReqRes('POST', {
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
    });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
