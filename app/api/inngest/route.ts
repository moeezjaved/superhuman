import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { functions } from '@/inngest/functions';

// The Inngest endpoint: the dev server + cloud call this to run our functions.
export const { GET, POST, PUT } = serve({ client: inngest, functions });
