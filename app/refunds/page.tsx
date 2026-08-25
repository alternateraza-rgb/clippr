import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, List, Section } from "@/components/legal/LegalPage";
import { LEGAL_CONTACT, LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Refund Policy — Clipmuse",
  description: "Clipmuse subscriptions are non-refundable. Cancel any time to stop future charges.",
};

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refund policy"
      updated={LEGAL_UPDATED}
      intro="Clipmuse is a monthly subscription with unlimited use. Payments are non-refundable. You can cancel at any time to stop the next charge."
    >
      <Section heading="No refunds">
        <p>
          All payments to Clipmuse are final. We do not provide refunds or credits
          for partial months, unused time, or subscriptions you forgot to cancel.
        </p>
        <p>
          This is because the plan is unlimited: a single billing period gives you
          unrestricted access to a service whose costs — transcription, analysis,
          rendering, storage and bandwidth — are incurred by us as you use it, and
          cannot be recovered once the work is done.
        </p>
      </Section>

      <Section heading="Cancelling">
        <p>
          You can cancel whenever you like. Cancelling stops the next payment and
          nothing else: you keep full access until the end of the billing period
          you have already paid for, and clips you have already made stay in your
          library.
        </p>
        <p>
          To cancel, use the billing settings in your account or email us at{" "}
          <a className="text-brand underline-offset-4 hover:underline" href={`mailto:${LEGAL_CONTACT}`}>
            {LEGAL_CONTACT}
          </a>
          . Cancelling before your renewal date is what prevents the charge —
          asking for a refund afterwards will not.
        </p>
      </Section>

      <Section heading="The narrow exceptions">
        <p>We will issue a refund in these cases, and generally only these:</p>
        <List
          items={[
            <>
              <strong className="font-medium text-ink">A duplicate or incorrect charge.</strong>{" "}
              If you were billed twice for the same period, or billed after a
              cancellation was confirmed, tell us and we will return it.
            </>,
            <>
              <strong className="font-medium text-ink">A prolonged failure on our side.</strong>{" "}
              If the service was unusable for an extended period during your
              billing month because of a fault we caused, contact us and we will
              look at your account individually.
            </>,
            <>
              <strong className="font-medium text-ink">Where the law requires it.</strong>{" "}
              Some countries give consumers statutory refund or cancellation
              rights that a policy cannot override. Where those apply to you,
              they apply — this policy does not take away any right you have by
              law.
            </>,
          ]}
        />
        <p>
          Things that are not grounds for a refund: changing your mind, not using
          the service, forgetting to cancel, dissatisfaction with how a particular
          clip was edited, or a source video that could not be processed.
        </p>
      </Section>

      <Section heading="Chargebacks">
        <p>
          If something looks wrong on your bill, email us first. We would rather
          fix a genuine mistake directly than through your bank. Accounts with an
          open chargeback may be suspended until it is resolved.
        </p>
      </Section>

      <Section heading="Questions">
        <p>
          Email{" "}
          <a className="text-brand underline-offset-4 hover:underline" href={`mailto:${LEGAL_CONTACT}`}>
            {LEGAL_CONTACT}
          </a>
          . See also our{" "}
          <Link className="text-brand underline-offset-4 hover:underline" href="/terms">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link className="text-brand underline-offset-4 hover:underline" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
