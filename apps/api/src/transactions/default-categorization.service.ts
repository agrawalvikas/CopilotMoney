import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface DefaultRule {
  keywords: string[];
  categoryName: string;
}

/**
 * Built-in keyword → category mappings applied as the last resort during
 * transaction categorization.  These rules fire only when no user-defined
 * CategorizationRule matched first (see the sync services for the priority order).
 *
 * Category names here must exactly match what is seeded in prisma/seed.ts.
 * If a name doesn't match a seeded category the lookup returns null and the
 * transaction is left uncategorized until the user assigns it manually.
 */
const defaultRules: DefaultRule[] = [
  { keywords: ['payroll', 'direct deposit'], categoryName: 'Paychecks' },
  { keywords: ['refund', 'return'], categoryName: 'Refunds' },
  { keywords: ['fee', 'charge'], categoryName: 'Fees' },
  { keywords: ['amazon', 'walmart', 'target', 'costco', 'best buy'], categoryName: 'Shopping' },
  { keywords: ['rent'], categoryName: 'Rent' },
  { keywords: ['uber', 'lyft', 'gas', 'exxon', 'shell', 'chevron', 'parking', 'transit'], categoryName: 'Auto & Transport' },
  { keywords: ['electric', 'water', 'internet', 'comcast', 'verizon', 'at&t'], categoryName: 'Utilities' },
  { keywords: ['starbucks', 'coffee', 'restaurant', 'bar', 'dining'], categoryName: 'Drinks & Dining' },
  { keywords: ['grocery', 'safeway', 'kroger'], categoryName: 'Groceries' },
  { keywords: ['pharmacy', 'cvs', 'walgreens'], categoryName: 'Personal Care' },
  { keywords: ['hospital', 'doctor', 'clinic', 'dental'], categoryName: 'Healthcare' },
  { keywords: ['netflix', 'spotify', 'hulu', 'disney+', 'movies'], categoryName: 'Entertainment' },
  { keywords: ['tax', 'irs'], categoryName: 'Taxes' },
  { keywords: ['airline', 'hotel', 'airbnb', 'expedia', 'COT'], categoryName: 'Travel & Vacation' },
];

/**
 * Two-layer categorization pipeline used at sync time:
 *
 *   1. User rules (CategorizationRule table) — checked first in the sync services
 *   2. This service (default keyword rules)  — checked only if no user rule matched
 *   3. Fallback to the "Other" category      — when neither layer matched
 *
 * The category ID map is loaded once from the database on module startup
 * (OnModuleInit) and kept in memory for the lifetime of the process, avoiding
 * a DB round-trip for every transaction during a sync.
 */
@Injectable()
export class DefaultCategorizationService implements OnModuleInit {
  // Maps category name → database UUID, populated at startup from system categories
  private categoryMap = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  /** Populate the in-memory map when the NestJS module finishes initializing. */
  async onModuleInit() {
    await this.loadCategoryMap();
  }

  /**
   * Fetches all system categories (userId = null) and stores name → id pairs.
   * System categories are the ones seeded in prisma/seed.ts and shared across all users.
   */
  private async loadCategoryMap() {
    const defaultCategories = await this.prisma.category.findMany({
      where: { userId: null },
    });
    for (const category of defaultCategories) {
      this.categoryMap.set(category.name, category.id);
    }
  }

  /**
   * Returns the category ID that best matches `description`, or null if the
   * "Other" fallback isn't found in the map.
   *
   * Matching is case-insensitive substring — first matching rule wins, so
   * more specific keywords should appear earlier in `defaultRules`.
   */
  async categorize(description: string): Promise<string | null> {
    // Guard against a race condition where categorize() is called before
    // onModuleInit() has finished (e.g. during cold-start parallel requests).
    if (this.categoryMap.size === 0) {
      await this.loadCategoryMap();
    }

    const lowerCaseDescription = description.toLowerCase();

    for (const rule of defaultRules) {
      for (const keyword of rule.keywords) {
        if (lowerCaseDescription.includes(keyword)) {
          return this.categoryMap.get(rule.categoryName) ?? null;
        }
      }
    }

    // Nothing matched — fall back to the generic "Other" category
    return this.categoryMap.get('Other') ?? null;
  }
}
