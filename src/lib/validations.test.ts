import { describe, it, expect } from 'vitest';
import {
  createProjectSchema,
  createProspectSchema,
  updateProspectStatusSchema,
  enrichProspectSchema,
  discoverSchema,
  outreachGenerateSchema,
  siteAnalysisSchema,
  bulkImportValidateSchema,
  linkVerifySchema,
  linkMonitorSchema,
  alertsCheckSchema,
  createKeywordAlertSchema,
  loginSchema,
  signupSchema,
} from './validations';

describe('createProjectSchema', () => {
  it('accepts valid project input', () => {
    const result = createProjectSchema.safeParse({
      name: 'My Project',
      target_url: 'https://example.com',
      niche: 'SaaS',
      target_keywords: ['keyword1'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const result = createProjectSchema.safeParse({ target_url: 'https://example.com' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid URL', () => {
    const result = createProjectSchema.safeParse({ name: 'Test', target_url: 'not-a-url' });
    expect(result.success).toBe(false);
  });
});

describe('createProspectSchema', () => {
  it('accepts valid prospect input', () => {
    const result = createProspectSchema.safeParse({
      prospect_url: 'https://prospect.com/page',
      opportunity_type: 'guest_post',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = createProspectSchema.safeParse({
      prospect_url: 'https://prospect.com',
      contact_email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateProspectStatusSchema', () => {
  it('accepts valid statuses', () => {
    for (const status of ['identified', 'won', 'lost', 'contacted', 'verification_error']) {
      expect(updateProspectStatusSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    expect(updateProspectStatusSchema.safeParse({ status: 'invalid' }).success).toBe(false);
  });
});

describe('enrichProspectSchema', () => {
  it('accepts valid UUID', () => {
    expect(enrichProspectSchema.safeParse({ prospect_id: '550e8400-e29b-41d4-a716-446655440000' }).success).toBe(true);
  });

  it('rejects non-UUID', () => {
    expect(enrichProspectSchema.safeParse({ prospect_id: 'not-a-uuid' }).success).toBe(false);
  });
});

describe('discoverSchema', () => {
  it('accepts valid discovery request', () => {
    const result = discoverSchema.safeParse({
      project_id: '550e8400-e29b-41d4-a716-446655440000',
      opportunity_types: ['guest_post', 'resource_link'],
    });
    expect(result.success).toBe(true);
  });

  it('applies default filters and limit', () => {
    const result = discoverSchema.parse({
      project_id: 'abc',
      opportunity_types: ['guest_post'],
    });
    expect(result.filters).toEqual({});
    expect(result.limit).toBe(50);
  });

  it('rejects empty opportunity_types', () => {
    expect(discoverSchema.safeParse({ project_id: 'abc', opportunity_types: [] }).success).toBe(false);
  });
});

describe('outreachGenerateSchema', () => {
  it('accepts valid outreach request', () => {
    const result = outreachGenerateSchema.safeParse({
      prospect_id: '550e8400-e29b-41d4-a716-446655440000',
      tone: 'friendly',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid tone', () => {
    expect(outreachGenerateSchema.safeParse({ prospect_id: '550e8400-e29b-41d4-a716-446655440000', tone: 'rude' }).success).toBe(false);
  });
});

describe('siteAnalysisSchema', () => {
  it('accepts valid URL', () => {
    expect(siteAnalysisSchema.safeParse({ site_url: 'https://example.com' }).success).toBe(true);
  });

  it('rejects non-URL', () => {
    expect(siteAnalysisSchema.safeParse({ site_url: 'not-a-url' }).success).toBe(false);
  });
});

describe('bulkImportValidateSchema', () => {
  it('accepts valid import request with defaults', () => {
    const result = bulkImportValidateSchema.parse({
      project_id: '550e8400-e29b-41d4-a716-446655440000',
      urls: ['https://site1.com', 'https://site2.com'],
    });
    expect(result.thresholds.min_da).toBe(10);
    expect(result.thresholds.min_relevance).toBe(30);
    expect(result.thresholds.max_spam_score).toBe(30);
  });

  it('rejects empty URLs', () => {
    expect(bulkImportValidateSchema.safeParse({ project_id: '550e8400-e29b-41d4-a716-446655440000', urls: [] }).success).toBe(false);
  });
});

describe('linkVerifySchema', () => {
  it('accepts valid UUID', () => {
    expect(linkVerifySchema.safeParse({ prospect_id: '550e8400-e29b-41d4-a716-446655440000' }).success).toBe(true);
  });

  it('rejects non-UUID', () => {
    expect(linkVerifySchema.safeParse({ prospect_id: 'bad' }).success).toBe(false);
  });
});

describe('linkMonitorSchema', () => {
  it('accepts valid UUID', () => {
    expect(linkMonitorSchema.safeParse({ project_id: '550e8400-e29b-41d4-a716-446655440000' }).success).toBe(true);
  });
});

describe('alertsCheckSchema', () => {
  it('accepts empty body', () => {
    expect(alertsCheckSchema.safeParse({}).success).toBe(true);
  });

  it('accepts optional project_id', () => {
    expect(alertsCheckSchema.safeParse({ project_id: '550e8400-e29b-41d4-a716-446655440000' }).success).toBe(true);
  });
});

describe('createKeywordAlertSchema', () => {
  it('accepts valid keyword alert', () => {
    expect(createKeywordAlertSchema.safeParse({
      project_id: '550e8400-e29b-41d4-a716-446655440000',
      keyword: 'seo tools',
    }).success).toBe(true);
  });

  it('rejects empty keyword', () => {
    expect(createKeywordAlertSchema.safeParse({
      project_id: '550e8400-e29b-41d4-a716-446655440000',
      keyword: '',
    }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid login', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'password' }).success).toBe(true);
  });

  it('rejects short password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '12345' }).success).toBe(false);
  });
});

describe('signupSchema', () => {
  it('accepts valid signup', () => {
    const result = signupSchema.safeParse({
      email: 'a@b.com',
      password: 'password123',
      full_name: 'Test User',
      org_name: 'Test Org',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short password', () => {
    expect(signupSchema.safeParse({
      email: 'a@b.com',
      password: '1234567',
      full_name: 'Test',
      org_name: 'Org',
    }).success).toBe(false);
  });
});
