import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Plan {
  milestones: { title: string; order_index: number }[];
  scheduledTasks: {
    id: string;
    title: string;
    description: string | null;
    milestone_index: number;
    duration_hours: number;
    priority: "low" | "medium" | "high" | null;
    start_day_offset: number;
    end_day_offset: number;
  }[];
}

const PlanOutlineView = ({ plan }: { plan: Plan }) => {
  const byMilestone = new Map<number, Plan["scheduledTasks"]>();
  for (const m of plan.milestones) {
    byMilestone.set(m.order_index, []);
  }
  for (const t of plan.scheduledTasks) {
    const arr = byMilestone.get(t.milestone_index) ?? [];
    arr.push(t);
    byMilestone.set(t.milestone_index, arr);
  }

  return (
    <section aria-labelledby="outline-heading">
      <h2 id="outline-heading" className="sr-only">Plan Outline</h2>
      <Accordion type="single" collapsible className="w-full">
        {plan.milestones.map((m) => (
          <AccordionItem key={m.order_index} value={`m-${m.order_index}`}>
            <AccordionTrigger>
              <div className="flex w-full items-center justify-between">
                <span className="font-medium">{m.title}</span>
                <span className="text-xs text-muted-foreground">Milestone {m.order_index}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2">
                {(byMilestone.get(m.order_index) ?? []).map((t) => (
                  <li key={t.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{t.title}</p>
                      <span className="text-xs text-muted-foreground">
                        {t.duration_hours}h • ({t.end_day_offset - t.start_day_offset + 1} days)
                      </span>
                    </div>
                    {t.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default PlanOutlineView;
