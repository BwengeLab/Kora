import { Plus } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { PageHeader } from '../../app/shell';
import { AccessAlertsCard } from './AccessAlertsCard';
import { AccessRequestsCard } from './AccessRequestsCard';
import { AdminStatCards } from './AdminStatCards';
import { FeatureMarketplaceCard } from './FeatureMarketplaceCard';
import { IntegrationStatusCard } from './IntegrationStatusCard';
import { PolicyBillingCard } from './PolicyBillingCard';
import { UsersAccessCard } from './UsersAccessCard';

// Org Admin "Admin Console" home (doc 06). Governs access, integrations,
// policies, billing — no financial approval authority.
export function HomeOrgAdmin() {
  return (
    <div className="flex flex-col">
      <PageHeader
        subtitle={<>Your organization&apos;s setup at a glance — access, integrations and policies.</>}
        right={
          <Link to="/settings/users-and-roles" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110">
            <Plus className="size-4" /> Invite user
          </Link>
        }
      />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        <AdminStatCards />

        {/* Users & access (centerpiece) + access alerts */}
        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12">
          <div className="@5xl:col-span-7"><UsersAccessCard /></div>
          <div className="@5xl:col-span-5"><AccessAlertsCard /></div>
        </section>

        {/* Access requests + integrations */}
        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12">
          <div className="@5xl:col-span-5"><AccessRequestsCard /></div>
          <div className="@5xl:col-span-7"><IntegrationStatusCard /></div>
        </section>

        {/* Custom features & vertical packs (unlock) */}
        <section>
          <FeatureMarketplaceCard />
        </section>

        {/* Policies + billing */}
        <section>
          <PolicyBillingCard />
        </section>
      </div>
    </div>
  );
}
