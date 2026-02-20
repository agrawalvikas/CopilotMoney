
export type SubCategory = {
  id: string;
  name: string;
  categoryId: string;
};

export type Account = {
  id: string;
  name: string;
  mask: string | null;
  type: string;
  balance: number | null;
  availableBalance?: number | null;
  currency: string;
  institutionName: string;
  isManual: boolean;
  connectionId: string | null;
  connection?: { provider: 'TELLER' | 'PLAID' } | null;
};

export enum TransactionFlow {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
  UNRECOGNIZED = 'UNRECOGNIZED',
}
