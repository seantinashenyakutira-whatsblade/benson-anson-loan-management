export const CATEGORY_ROUTES: Record<string, string> = {
  'Loan application question': 'loan_officer',
  'Payment issue': 'cashier',
  'Account problem': 'branch_manager',
  'Complaint': 'owner',
  'Technical': 'owner',
};

export const CATEGORIES = Object.keys(CATEGORY_ROUTES);

export function routedRole(category: string): string {
  return CATEGORY_ROUTES[category] ?? 'loan_officer';
}
