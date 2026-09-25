export interface StaticPage {
  name: string;
  href: string;
}

export const STATIC_PAGES: StaticPage[] = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Customers', href: '/customers' },
  { name: 'Loans', href: '/loans' },
  { name: 'Payments', href: '/payments' },
  { name: 'Reports', href: '/reports' },
  { name: 'Collateral', href: '/collateral' },
  { name: 'Collections', href: '/collections' },
  { name: 'Penalties', href: '/penalties' },
  { name: 'Invitations', href: '/invitations' },
  { name: 'Leads', href: '/leads' },
  { name: 'Loan Products', href: '/settings/loan-products' },
  { name: 'Permissions', href: '/settings/permissions' },
  { name: 'Users', href: '/users' },
  { name: 'Audit Log', href: '/audit' },
  { name: 'Notifications', href: '/notifications' },
  { name: 'Profile', href: '/profile' },
  { name: 'Settings', href: '/settings' },
];
