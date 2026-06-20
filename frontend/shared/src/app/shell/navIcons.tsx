import {
  Activity,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  CalendarClock,
  CheckSquare,
  CircleGauge,
  CreditCard,
  Database,
  FileSearch,
  FileText,
  GitBranch,
  Handshake,
  Home,
  Inbox,
  Landmark,
  LayoutGrid,
  LineChart,
  Network,
  Receipt,
  ScrollText,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  Upload,
  UserCog,
  Users,
  Wallet,
  Wrench,
  Workflow,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

type IconCmp = ComponentType<SVGProps<SVGSVGElement>>;

// Map blueprint nav ids → icon. Keeps icon choice out of the blueprint configs
// so designers can re-skin without touching role definitions.
export const navIcons: Record<string, IconCmp> = {
  // Tenant plane
  home: Home,
  reconciliation: GitBranch,
  approvals: CheckSquare,
  ledger: Wallet,
  collections: Inbox,
  reports: BarChart3,
  roi: TrendingUp,
  relationships: Handshake,
  contracts: ScrollText,
  credit_passport: CreditCard,
  agents: Bot,
  audit: ShieldCheck,
  consent: Share2,
  data_intake: Upload,
  transactions: Receipt,
  settings: Settings,
  'settings.org': Building2,
  'settings.users': Users,
  'settings.policies': SlidersHorizontal,
  'settings.integrations': Workflow,
  'settings.billing': CreditCard,
  'settings.data': Database,

  // Platform plane
  'platform.home': LayoutGrid,
  'platform.tenants': Briefcase,
  'platform.plans': CreditCard,
  'platform.config': Wrench,
  'platform.health': Activity,
  'platform.usage': LineChart,
  'platform.users': UserCog,
  'platform.support': FileSearch,
  'platform.audit': ScrollText,

  // External portal
  'portal.home': Home,
  'portal.credit_passport': CreditCard,
  'portal.access': CalendarClock,
};

export function NavIcon({ id, className }: { id: string; className?: string }) {
  const Icon = navIcons[id] ?? Network;
  return <Icon className={className} />;
}

export const fallbackIcons = {
  search: FileSearch,
  bell: Inbox,
  copilot: Bot,
  tenant: Landmark,
  gauge: CircleGauge,
  doc: FileText,
};
