
export type Account = {
  id: string;
  name: string;
  mask: string;
  type: string;
  balance: number;
  availableBalance?: number | null;
  currency: string;
  institutionName: string;
};

export enum TransactionFlow {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}
