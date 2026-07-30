/**
 * Cortex Capability Registry
 * -----------------------------------------------------------------------------
 * The SINGLE SOURCE OF TRUTH for what skills can do. Reads are ungated/implicit
 * for every connected source; only WRITE actions live here (mirrors LemonLime's
 * model — doc 28). The compiler is grounded on this list and MUST reject any step
 * whose action isn't here (fixes LemonLime's "over-promise a connector" bug — the
 * check is enforced in code, not left to the prompt).
 *
 * Two shapes:
 *  - AtomicAction: one provider write (gmail.send_draft, linkedin.send_invitation)
 *  - CompositeTool: higher-order async/batch tool (source_and_enrich_leads, ...)
 *
 * `irreversible: true` => default approvalMode 'require_approval' (send/share/trash/post).
 * Seeded verbatim from LemonLime's leaked catalog + our net-new connectors.
 */

export type ApprovalMode = 'auto' | 'require_approval' | 'deny';

export interface AtomicAction {
  id: string;              // `${provider}.${action}` — stable, uniform (unlike LemonLime's mixed prefixes)
  provider: string;
  action: string;
  label: string;
  irreversible: boolean;   // send/share/delete/publish -> gate by default
  defaultApproval: ApprovalMode;
  net_new?: boolean;       // capabilities LemonLime does NOT have (our wedge)
}

export interface CompositeTool {
  id: string;
  label: string;
  async: boolean;          // runs outside the chat, results return later
  batchApproval: boolean;  // one confirmation covers the whole batch
  description: string;
}

const gate = (irreversible: boolean): ApprovalMode =>
  irreversible ? 'require_approval' : 'auto';

// helper to declare an atomic action
const a = (
  provider: string,
  action: string,
  label: string,
  irreversible = false,
  net_new = false,
): AtomicAction => ({
  id: `${provider}.${action}`,
  provider,
  action,
  label,
  irreversible,
  defaultApproval: gate(irreversible),
  ...(net_new ? { net_new } : {}),
});

/* ----------------------------- ATOMIC ACTIONS ----------------------------- */
/* Verbatim from LemonLime's write-action catalog (doc 28), normalized to
   `provider.action` ids. Reads are implicit and intentionally NOT listed.     */
export const ATOMIC_ACTIONS: AtomicAction[] = [
  // Dropbox
  a('dropbox', 'create_shared_link', 'Create shareable link', true),
  a('dropbox', 'upload_file', 'Upload file'),
  a('dropbox', 'create_folder', 'Create folder'),
  a('dropbox', 'move', 'Move file/folder'),
  a('dropbox', 'add_folder_member', 'Add folder member', true),
  a('dropbox', 'remove_folder_member', 'Remove folder member', true),
  a('dropbox', 'share_folder', 'Share folder', true),

  // Gmail  (send_draft proves send IS a platform capability — "drafts only" is policy)
  a('gmail', 'create_draft', 'Create email draft'),
  a('gmail', 'update_draft', 'Update email draft'),
  a('gmail', 'send_draft', 'Send email', true),
  a('gmail', 'mark_read', 'Mark read'),
  a('gmail', 'mark_unread', 'Mark unread'),
  a('gmail', 'trash', 'Trash email', true),
  a('gmail', 'create_label', 'Create label'),
  a('gmail', 'add_label', 'Add label'),
  a('gmail', 'remove_label', 'Remove label'),

  // Outlook
  a('outlook', 'create_draft', 'Create email draft'),
  a('outlook', 'update_draft', 'Update email draft'),
  a('outlook', 'send_mail', 'Send email', true),
  a('outlook', 'mark_read', 'Mark read'),
  a('outlook', 'mark_unread', 'Mark unread'),
  a('outlook', 'trash', 'Trash email', true),
  a('outlook', 'create_event', 'Create calendar event'),
  a('outlook', 'update_event', 'Update calendar event'),

  // Google Drive
  a('gdrive', 'move_file', 'Move file'),
  a('gdrive', 'create_folder', 'Create folder'),
  a('gdrive', 'upload_file', 'Upload file'),
  a('gdrive', 'create_doc', 'Create Google Doc'),
  a('gdrive', 'create_spreadsheet', 'Create spreadsheet'),
  a('gdrive', 'append_rows', 'Append rows'),
  a('gdrive', 'add_tab', 'Add sheet tab'),
  a('gdrive', 'update_values', 'Update cell values'),

  // Google Calendar
  a('gcal', 'create_event', 'Create calendar event'),
  a('gcal', 'update_event', 'Update calendar event'),

  // OneDrive
  a('onedrive', 'move_item', 'Move item'),
  a('onedrive', 'create_folder', 'Create folder'),
  a('onedrive', 'upload_file', 'Upload file'),

  // SharePoint
  a('sharepoint', 'move_item', 'Move item'),
  a('sharepoint', 'create_folder', 'Create folder'),

  // Slack
  a('slack', 'post_message', 'Post message', true),
  a('slack', 'add_reaction', 'Add reaction'),
  a('slack', 'create_channel', 'Create channel'),
  a('slack', 'create_canvas', 'Create canvas'),
  a('slack', 'send_dm', 'Send DM', true),

  // Notion
  a('notion', 'create_page', 'Create page'),
  a('notion', 'append_blocks', 'Append blocks'),
  a('notion', 'create_comment', 'Create comment'),

  // Everflow (narrow write set, per LemonLime)
  a('everflow', 'update_offer_status', 'Update offer status', true),
  a('everflow', 'update_partner_status', 'Update partner status', true),

  // LinkedIn (Unipile "act as you" — doc 26)
  a('linkedin', 'create_post', 'Create post', true),
  a('linkedin', 'react_to_post', 'React to post'),
  a('linkedin', 'comment_on_post', 'Comment on post', true),
  a('linkedin', 'send_message', 'Send message', true),
  a('linkedin', 'respond_to_invitation', 'Respond to invitation'),
  a('linkedin', 'send_invitation', 'Send connection request', true),
  a('linkedin', 'send_inmail', 'Send InMail', true),

  /* --------- NET-NEW: our wedge (LemonLime has none of these) --------- */
  // WhatsApp / Instagram via the SAME Unipile API (doc 26/27)
  a('whatsapp', 'send_message', 'Send WhatsApp message', true, true),
  a('instagram', 'send_message', 'Send Instagram DM', true, true),
  a('telegram', 'send_message', 'Send Telegram message', true, true),
  // Commerce + payments (LemonLime has neither — doc 27)
  a('shopify', 'create_draft_order', 'Create draft order', true, true),
  a('shopify', 'update_order', 'Update order', true, true),
  a('shopify', 'create_discount', 'Create discount code', true, true),
  a('stripe', 'create_refund', 'Issue refund', true, true),
  a('stripe', 'create_invoice', 'Create invoice', true, true),
  a('woocommerce', 'update_order', 'Update WooCommerce order', true, true),
  // CRM writes
  a('hubspot', 'create_contact', 'Create contact', false, true),
  a('hubspot', 'update_deal', 'Update deal', false, true),
];

/* --------------------------- COMPOSITE TOOLS ------------------------------ */
/* Higher-order async/batch tools LemonLime's runtime exposes (doc 31). Pattern:
   "one call, one approval, batch review". We model these as first-class.       */
export const COMPOSITE_TOOLS: CompositeTool[] = [
  {
    id: 'source_and_enrich_leads',
    label: 'Source & enrich leads',
    async: true,
    batchApproval: true,
    description:
      'Find a capped batch of ICP-matching leads and enrich emails/titles/company where verifiable. One approval covers the whole flow; results return into the run.',
  },
  {
    id: 'draft_emails',
    label: 'Draft emails (batch)',
    async: false,
    batchApproval: true,
    description:
      'Create N personalized email drafts in one call. Single confirmation covers all; per-email review (send/delete) after.',
  },
  {
    id: 'save_documents',
    label: 'Save documents (batch)',
    async: false,
    batchApproval: true,
    description:
      'Save N documents to connected storage in one call. HTML → native Google Doc; plain text → Dropbox/OneDrive. One confirmation names every doc.',
  },
  {
    id: 'upload_spreadsheet',
    label: 'Upload spreadsheet',
    async: false,
    batchApproval: true,
    description:
      'Build a spreadsheet from plain column values (header + rows). Built in code, CSV-injection-safe, saved as a gated write. Never hand-assemble CSV.',
  },
  {
    id: 'propose_skill',
    label: 'Propose a new skill',
    async: false,
    batchApproval: true,
    description:
      'Draft a NEW skill (automation) for the user to approve via a review card. (Internally automations are "skills".)',
  },
];

/* ------------------------------ LOOKUPS ----------------------------------- */
const ATOMIC_BY_ID = new Map(ATOMIC_ACTIONS.map((x) => [x.id, x]));
const COMPOSITE_BY_ID = new Map(COMPOSITE_TOOLS.map((x) => [x.id, x]));

/** True iff this action id is a real capability. The compiler MUST call this
 *  before emitting any write step — code-enforced, not prompt-trusted. */
export function isKnownCapability(id: string): boolean {
  return ATOMIC_BY_ID.has(id) || COMPOSITE_BY_ID.has(id);
}

export function getAtomic(id: string): AtomicAction | undefined {
  return ATOMIC_BY_ID.get(id);
}

/** Default approval mode for an action (irreversible => require_approval). */
export function defaultApprovalFor(id: string): ApprovalMode {
  return ATOMIC_BY_ID.get(id)?.defaultApproval ?? 'require_approval';
}

/** The catalog the compiler is grounded on, split by connection state.
 *  `connectedProviders` comes from the workspace's live connections. */
export function catalogForWorkspace(connectedProviders: Set<string>) {
  const connected: AtomicAction[] = [];
  const supported: AtomicAction[] = [];
  for (const act of ATOMIC_ACTIONS) {
    (connectedProviders.has(act.provider) ? connected : supported).push(act);
  }
  return { connected, supported, composite: COMPOSITE_TOOLS };
}
