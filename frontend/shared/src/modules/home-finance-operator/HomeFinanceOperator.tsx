import { PageHeader } from '../../app/shell';
import { seedOperatorFocus } from '../../seed/operatorHome';
import { AgentSuggestionsCard } from './AgentSuggestionsCard';
import { DataIntakeCard } from './DataIntakeCard';
import { FocusCards } from './FocusCards';
import { MyTasksCard } from './MyTasksCard';
import { ResumeThroughputCard } from './ResumeThroughputCard';

// Finance Operator "My Work" home — opens straight into what needs the
// operator today (doc 04 §Home). Action-oriented: every block links into the
// workspace that resolves it.
export function HomeFinanceOperator() {
  const f = seedOperatorFocus;
  return (
    <div className="flex flex-col">
      <PageHeader subtitle={<>{f.exceptionsToClear} exceptions and a few tasks need you today. Let&apos;s clear them.</>} />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        <FocusCards />

        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-2">
          <ResumeThroughputCard />
          <AgentSuggestionsCard />
        </section>

        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-2">
          <MyTasksCard />
          <DataIntakeCard />
        </section>
      </div>
    </div>
  );
}
