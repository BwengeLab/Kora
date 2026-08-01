import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { fetchOperatorDashboard } from '../../api/roleHomes';
import { useSessionStore } from '../../state/sessionStore';
import { AgentSuggestionsCard } from './AgentSuggestionsCard';
import { DataIntakeCard } from './DataIntakeCard';
import { FocusCards } from './FocusCards';
import { MyTasksCard } from './MyTasksCard';
import { ResumeThroughputCard } from './ResumeThroughputCard';

// Finance Operator "My Work" home — opens straight into what needs the
// operator today (doc 04 §Home). Action-oriented: every block links into the
// workspace that resolves it.
export function HomeFinanceOperator() {
  const apiBaseUrl = getApiBaseUrl();
  const token = useSessionStore((s) => s.session?.token ?? '');
  const { data } = useQuery({
    queryKey: ['operator-dashboard', token],
    queryFn: ({ signal }) => fetchOperatorDashboard(apiBaseUrl, token, signal),
    enabled: Boolean(token),
  });
  const f = data?.focus ?? seedOperatorFocus;
  const throughput = data?.throughput ?? undefined;
  const resume = data?.resume ?? undefined;
  const tasks = data?.tasks ?? undefined;
  const intakeBatches = data?.intakeBatches ?? undefined;
  return (
    <div className="flex flex-col">
      <PageHeader subtitle={<>{f.exceptionsToClear} exceptions and a few tasks need you today. Let&apos;s clear them.</>} />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        <FocusCards focus={f} />

        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-2">
          <ResumeThroughputCard {...(throughput ? { throughput } : {})} {...(resume ? { resume } : {})} />
          <AgentSuggestionsCard />
        </section>

        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-2">
          <MyTasksCard {...(tasks ? { tasks } : {})} />
          <DataIntakeCard {...(intakeBatches ? { batches: intakeBatches } : {})} />
        </section>
      </div>
    </div>
  );
}
