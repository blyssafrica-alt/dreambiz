import type { DreamBigBook } from '@/types/business';

export interface BookChapter {
  book: DreamBigBook;
  chapter: number;
  title: string;
  topic: string[];
}

export const BOOK_CHAPTERS: BookChapter[] = [
  // Start Your Business
  { book: 'start-your-business', chapter: 1, title: 'Finding Your Business Idea', topic: ['idea-validation', 'market-research'] },
  { book: 'start-your-business', chapter: 2, title: 'Testing Market Demand', topic: ['market-testing', 'customer-validation'] },
  { book: 'start-your-business', chapter: 3, title: 'Calculating Start-Up Costs', topic: ['capital', 'startup-costs', 'pricing'] },
  { book: 'start-your-business', chapter: 4, title: 'Pricing for Profit', topic: ['pricing', 'profit-margin', 'costs'] },
  { book: 'start-your-business', chapter: 5, title: 'Managing Your Money', topic: ['cashflow', 'expenses', 'financial-tracking'] },
  { book: 'start-your-business', chapter: 6, title: 'Making Your First Sales', topic: ['sales', 'customers', 'marketing'] },

  // Grow Your Business
  { book: 'grow-your-business', chapter: 1, title: 'Understanding Growth Stages', topic: ['business-stage', 'growth'] },
  { book: 'grow-your-business', chapter: 2, title: 'Increasing Sales Volume', topic: ['sales', 'growth', 'revenue'] },
  { book: 'grow-your-business', chapter: 3, title: 'Managing Growth Carefully', topic: ['expansion', 'risk', 'cash-management'] },
  { book: 'grow-your-business', chapter: 4, title: 'When NOT to Expand', topic: ['expansion', 'risk', 'timing'] },
  { book: 'grow-your-business', chapter: 5, title: 'Building Customer Loyalty', topic: ['customers', 'retention', 'relationships'] },

  // Manage Your Money
  { book: 'manage-your-money', chapter: 1, title: 'Why Businesses Fail Financially', topic: ['cashflow', 'financial-management'] },
  { book: 'manage-your-money', chapter: 2, title: 'Understanding Profit vs Cash', topic: ['profit', 'cashflow', 'financial-basics'] },
  { book: 'manage-your-money', chapter: 3, title: 'Creating a Cashflow Plan', topic: ['cashflow', 'planning', 'projections'] },
  { book: 'manage-your-money', chapter: 4, title: 'Controlling Expenses', topic: ['expenses', 'cost-control', 'overspending'] },
  { book: 'manage-your-money', chapter: 5, title: 'Budgeting for Success', topic: ['budgets', 'planning', 'financial-control'] },
  { book: 'manage-your-money', chapter: 6, title: 'Dealing with Inflation', topic: ['inflation', 'pricing', 'costs'] },

  // Hire and Lead
  { book: 'hire-and-lead', chapter: 1, title: 'When to Hire Your First Employee', topic: ['hiring', 'employees', 'timing'] },
  { book: 'hire-and-lead', chapter: 2, title: 'Finding the Right People', topic: ['hiring', 'recruitment', 'employees'] },
  { book: 'hire-and-lead', chapter: 3, title: 'Managing Payroll Costs', topic: ['employees', 'payroll', 'expenses'] },
  { book: 'hire-and-lead', chapter: 4, title: 'Leading Your Team', topic: ['leadership', 'management', 'employees'] },

  // Marketing Mastery
  { book: 'marketing-mastery', chapter: 1, title: 'Understanding Your Customer', topic: ['customers', 'marketing', 'target-market'] },
  { book: 'marketing-mastery', chapter: 2, title: 'Low-Cost Marketing Strategies', topic: ['marketing', 'promotion', 'budget'] },
  { book: 'marketing-mastery', chapter: 3, title: 'Building Your Brand', topic: ['branding', 'marketing', 'reputation'] },
  { book: 'marketing-mastery', chapter: 4, title: 'Winning and Keeping Customers', topic: ['customers', 'retention', 'sales'] },

  // Scale Up
  { book: 'scale-up', chapter: 1, title: 'Preparing for Scale', topic: ['scale', 'expansion', 'planning'] },
  { book: 'scale-up', chapter: 2, title: 'Systems and Processes', topic: ['systems', 'processes', 'efficiency'] },
  { book: 'scale-up', chapter: 3, title: 'Managing Multiple Locations', topic: ['expansion', 'multi-location', 'scale'] },
  { book: 'scale-up', chapter: 4, title: 'Financial Planning for Scale', topic: ['finance', 'scale', 'capital'] },
];

export const getChapterForTopic = (userBook: DreamBigBook | undefined, topic: string): BookChapter | undefined => {
  if (!userBook || userBook === 'none') return undefined;
  
  return BOOK_CHAPTERS.find(chapter => 
    chapter.book === userBook && chapter.topic.includes(topic)
  );
};

export const getChapterReference = (userBook: DreamBigBook | undefined, topic: string): string | undefined => {
  const chapter = getChapterForTopic(userBook, topic);
  if (!chapter) return undefined;
  
  return `See Chapter ${chapter.chapter}: "${chapter.title}" in your DreamBig book`;
};
