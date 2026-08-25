import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, List, Section } from "@/components/legal/LegalPage";
import { LEGAL_CONTACT, LEGAL_ENTITY, LEGAL_JURISDICTION, LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service — Clipmuse",
  description: "The terms you agree to when you use Clipmuse.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      updated={LEGAL_UPDATED}
      intro={`These terms are the agreement between you and ${LEGAL_ENTITY} ("Clipmuse", "we", "us") for use of the Clipmuse website and service. By creating an account or using the service, you accept them.`}
    >
      <Section heading="What Clipmuse does">
        <p>
          You give us a link to a longform video. We read its transcript, choose
          the strongest moment or sequence of moments, and produce a short
          vertical video with captions, which you can download and post.
        </p>
        <p>
          The editorial choices are made by an automated system. We do not
          guarantee that any particular clip will be good, will perform well, or
          will be usable for your purpose.
        </p>
      </Section>

      <Section heading="Your account">
        <p>
          You need an account to use Clipmuse. Keep your login details to
          yourself — you are responsible for what happens under your account. Tell
          us promptly if you think someone else has access to it.
        </p>
        <p>
          You must be at least 18, or old enough to enter a contract where you
          live, and you must not be barred from using the service under any
          applicable law.
        </p>
      </Section>

      <Section heading="Source material and your responsibility for it">
        <p>
          This is the most important section of these terms. Clipmuse processes
          videos <em>you</em> choose. It does not give you any rights to those
          videos, and it does not check whether you have them.
        </p>
        <List
          items={[
            "You are solely responsible for having the right to use, edit and publish any video you submit, and for anything you do with the clip we return.",
            "You must comply with the terms of the platform the source video came from, including YouTube's Terms of Service, and with all applicable copyright law.",
            "You must not use Clipmuse to reproduce or redistribute content you have no right to redistribute, or in a way that infringes anyone's intellectual property, privacy or publicity rights.",
            "Clips are derived from someone else's work unless you own the source. Whether your use of it is lawful is a question about your use, not about our tool, and it is yours to answer.",
          ]}
        />
        <p>
          If a rights holder contacts us about material processed through your
          account, we may remove it and suspend or terminate your access.
        </p>
      </Section>

      <Section heading="Acceptable use">
        <p>You agree not to:</p>
        <List
          items={[
            "Use the service to create content that is unlawful, defamatory, harassing, deceptive, or that sexualises minors.",
            "Misrepresent edited clips as unedited, or edit source material so as to make someone appear to say something they did not say.",
            "Resell, sublicense or white-label the service without our written agreement.",
            "Attempt to break, overload, reverse engineer or circumvent limits on the service, or use it to build a competing product.",
            "Share your account with others, or automate access outside of features we provide for that purpose.",
          ]}
        />
      </Section>

      <Section heading="Subscription and billing">
        <p>
          Clipmuse is $150 per month for unlimited generations. The subscription
          renews automatically each month until you cancel, and is charged to the
          payment method you provide through our payment processor. We do not
          store your card details.
        </p>
        <p>
          You can cancel at any time; cancellation stops the next charge and you
          keep access until the end of the period already paid for. Payments are
          non-refundable — the{" "}
          <Link className="text-brand underline-offset-4 hover:underline" href="/refunds">
            Refund Policy
          </Link>{" "}
          forms part of these terms and sets out the narrow exceptions.
        </p>
        <p>
          We may change the price. If we do, we will tell you before it applies to
          you, and the change will take effect at your next renewal — never
          retroactively.
        </p>
      </Section>

      <Section heading="Ownership">
        <p>
          We do not claim ownership of the source videos you submit or of the
          clips produced from them. As between you and us, whatever rights exist
          in the output are yours, subject to the rights of whoever owns the
          source material.
        </p>
        <p>
          The Clipmuse software, interface, branding and underlying systems remain
          ours. Nothing here transfers them to you.
        </p>
        <p>
          We may process the content you submit in order to provide the service —
          transcribing it, analysing it, rendering it and storing the result for
          your library.
        </p>
      </Section>

      <Section heading="Availability">
        <p>
          We do not promise the service will be uninterrupted. Processing depends
          on third parties — the source platform, transcription and model
          providers, hosting — and any of them can fail or change. We may modify
          or discontinue features, and we will try to give notice of significant
          changes.
        </p>
      </Section>

      <Section heading="Suspension and termination">
        <p>
          You can stop using Clipmuse and cancel at any time. We may suspend or
          terminate an account that breaches these terms, that exposes us or our
          providers to legal risk, or where required by law. Where it is
          reasonable to do so, we will tell you why.
        </p>
      </Section>

      <Section heading="Disclaimers">
        <p>
          The service is provided &quot;as is&quot; and &quot;as available&quot;.
          To the fullest extent permitted by law we disclaim implied warranties,
          including fitness for a particular purpose and non-infringement. We do
          not warrant that clips will be accurate, complete, lawful for your
          intended use, or free from error.
        </p>
      </Section>

      <Section heading="Limitation of liability">
        <p>
          To the fullest extent permitted by law, we are not liable for indirect,
          incidental, special or consequential losses, or for lost profits, lost
          revenue, lost data, or claims brought against you by third parties over
          content you published.
        </p>
        <p>
          Our total liability arising out of or relating to the service is limited
          to the amount you paid us in the twelve months before the event giving
          rise to the claim.
        </p>
        <p>
          Nothing in these terms excludes liability that cannot lawfully be
          excluded, including for death or personal injury caused by negligence,
          or for fraud.
        </p>
      </Section>

      <Section heading="Indemnity">
        <p>
          You agree to indemnify us against claims, damages and reasonable costs
          arising from your use of the service, from content you submitted or
          published, or from your breach of these terms.
        </p>
      </Section>

      <Section heading="Changes to these terms">
        <p>
          We may update these terms. If a change is material we will give notice
          before it takes effect. Continuing to use the service after that means
          you accept the updated terms.
        </p>
      </Section>

      <Section heading="Governing law">
        <p>
          These terms are governed by the laws of {LEGAL_JURISDICTION}, and the
          courts of {LEGAL_JURISDICTION} have exclusive jurisdiction — except that
          if you are a consumer, you keep the benefit of any mandatory protections
          of the law where you live.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions about these terms:{" "}
          <a className="text-brand underline-offset-4 hover:underline" href={`mailto:${LEGAL_CONTACT}`}>
            {LEGAL_CONTACT}
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
