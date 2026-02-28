import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyProspectLink } from './link-verification';
import { makeProspect } from '@/src/test/mocks';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('verifyProspectLink', () => {
  const targetUrl = 'https://example.com';

  it('returns link_live=true when target URL is found in href', async () => {
    const prospect = makeProspect({
      status: 'won',
      link_live: false,
      prospect_url: 'https://prospect.com/page',
    });

    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => '<html><body><a href="https://example.com/blog">Link</a></body></html>',
    });

    const result = await verifyProspectLink(prospect, targetUrl);
    expect(result.link_live).toBe(true);
    expect(result.lost_at).toBeNull();
  });

  it('returns link_live=false when target URL is not in page', async () => {
    const prospect = makeProspect({
      status: 'won',
      link_live: true,
      prospect_url: 'https://prospect.com/page',
    });

    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => '<html><body><a href="https://other.com">Other</a></body></html>',
    });

    const result = await verifyProspectLink(prospect, targetUrl);
    expect(result.link_live).toBe(false);
    expect(result.lost_at).not.toBeNull();
  });

  it('returns link_live=false when fetch fails with HTTP error', async () => {
    const prospect = makeProspect({
      status: 'won',
      link_live: true,
    });

    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    const result = await verifyProspectLink(prospect, targetUrl);
    expect(result.link_live).toBe(false);
    expect(result.error).toBe('HTTP 404');
  });

  it('returns link_live=false when fetch throws network error', async () => {
    const prospect = makeProspect({
      status: 'won',
      link_live: true,
    });

    mockFetch.mockRejectedValue(new Error('Network timeout'));

    const result = await verifyProspectLink(prospect, targetUrl);
    expect(result.link_live).toBe(false);
    expect(result.error).toBe('Network timeout');
  });

  it('preserves existing link_lost_at if link was already lost', async () => {
    const existingLostAt = '2025-01-01T00:00:00Z';
    const prospect = makeProspect({
      status: 'won',
      link_live: false,
      link_lost_at: existingLostAt,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => '<html><body>No links here</body></html>',
    });

    const result = await verifyProspectLink(prospect, targetUrl);
    expect(result.link_live).toBe(false);
    expect(result.lost_at).toBe(existingLostAt);
  });

  it('uses link_url when available', async () => {
    const prospect = makeProspect({
      status: 'won',
      link_url: 'https://prospect.com/specific-page',
    });

    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => '<html><body><a href="https://example.com">Link</a></body></html>',
    });

    await verifyProspectLink(prospect, targetUrl);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://prospect.com/specific-page',
      expect.objectContaining({ redirect: 'follow' }),
    );
  });

  it('detects backlink with www prefix', async () => {
    const prospect = makeProspect({ status: 'won' });

    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => '<html><body><a href="https://www.example.com/page">Link</a></body></html>',
    });

    const result = await verifyProspectLink(prospect, targetUrl);
    expect(result.link_live).toBe(true);
  });
});
