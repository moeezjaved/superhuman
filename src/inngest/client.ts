import { Inngest } from 'inngest';

/** The durable-execution client. Runs skills reliably: cron triggers, event
 *  triggers, real waits (step.sleep), and approval gates (step.waitForEvent). */
export const inngest = new Inngest({ id: 'cortex' });

/** Event names — the trigger surface. */
export const EVENTS = {
  RUN_REQUESTED: 'skill/run.requested',
  APPROVAL_DECIDED: 'skill/approval.decided',
} as const;
