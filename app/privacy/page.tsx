import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, List, Section } from "@/components/legal/LegalPage";
import { LEGAL_CONTACT, LEGAL_ENTITY, LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — Clipmuse",
  description: "What Clipmuse collects, why, who it is shared with, and how to have it deleted.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated={LEGAL_UPDATED}
      intro={`This explains what ${LEGAL_ENTITY} collects when you use Clipmuse, why we collect it, who else sees it, and how to get it deleted.`}
    >
      <Section heading="What we collect">
        <List
          items={[
            <>
              <strong className="font-medium text-ink">Account details.</strong> Your
              email address, and a password held as a hash by our authentication
              provider. We never see your password.
            </>,
            <>
              <strong className="font-medium text-ink">What you submit.</strong> The
              video links you paste and the settings you choose. We do not need
              your name, address or date of birth, and we do not ask for them.
            </>,
            <>
              <strong className="font-medium text-ink">What we produce.</strong> The
              transcripts, captions and finished clips generated from your
              submissions, stored so your library works.
            </>,
            <>
              <strong className="font-medium text-ink">Preferences.</strong> Your
              niche, caption and gameplay settings, so the app remembers how you
              like to work.
            </>,
            <>
              <strong className="font-medium text-ink">Technical logs.</strong> Ordinary
              server records — request times, errors, and whether a render
              succeeded — used to keep the service working.
            </>,
            <>
              <strong className="font-medium text-ink">Payment records.</strong> Our
              payment processor handles your card. We receive confirmation of
              status and the last digits, never the full card number.
            </>,
          ]}
        />
      </Section>

      <Section heading="Why we use it">
        <p>
          To run the service you asked for: authenticating you, processing the
          videos you submit, storing your clips, taking payment, answering support
          questions, and diagnosing faults. We do not sell your data, and we do
          not use it for advertising.
        </p>
      </Section>

      <Section heading="Who else processes it">
        <p>
          Making a clip means sending parts of your content to specialist
          providers. Each one only receives what its job needs:
        </p>
        <List
          items={[
            <>
              <strong className="font-medium text-ink">Supabase</strong> — database,
              file storage and authentication. Your account, settings and finished
              clips live here.
            </>,
            <>
              <strong className="font-medium text-ink">OpenAI</strong> — transcription
              of clip audio, and the analysis that decides what a clip should be
              about. Transcript text and short audio extracts are sent.
            </>,
            <>
              <strong className="font-medium text-ink">Supadata</strong> — fetches
              transcripts for public videos. Receives the video link.
            </>,
            <>
              <strong className="font-medium text-ink">YouTube / Google</strong> —
              public video metadata. Receives video identifiers.
            </>,
            <>
              <strong className="font-medium text-ink">Vercel</strong> — hosting for
              the website and its APIs.
            </>,
            <>
              <strong className="font-medium text-ink">Our payment processor</strong> —
              handles checkout, card details and renewals under its own privacy
              policy.
            </>,
          ]}
        />
        <p>
          We may also disclose information where the law requires it, or to
          protect our rights, safety or property.
        </p>
      </Section>

      <Section heading="Where it is kept, and for how long">
        <p>
          Data is stored on infrastructure operated by the providers above, which
          may be located outside your country. We keep your account data for as
          long as your account exists, and clips until you delete them or the
          account closes.
        </p>
        <p>
          Transcripts of public videos are cached so the same video does not have
          to be processed twice. Logs are kept for a limited period for
          troubleshooting.
        </p>
      </Section>

      <Section heading="Cookies">
        <p>
          We use cookies to keep you signed in and to keep your session secure.
          There are no advertising or cross-site tracking cookies. Blocking the
          session cookie will stop you being able to log in.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>
          Depending on where you live, you may have the right to access a copy of
          your data, correct it, delete it, restrict or object to processing, or
          receive it in a portable form. You can exercise any of these by emailing{" "}
          <a className="text-brand underline-offset-4 hover:underline" href={`mailto:${LEGAL_CONTACT}`}>
            {LEGAL_CONTACT}
          </a>
          .
        </p>
        <p>
          Deleting your account removes your profile, your stored clips and your
          settings. Some records may persist briefly in backups, and we keep what
          we must for tax and accounting.
        </p>
      </Section>

      <Section heading="Security">
        <p>
          Traffic is encrypted in transit, access to production data is limited to
          those who need it, and clips are served through expiring signed links
          rather than public URLs. No service can promise perfect security, and we
          do not.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          Clipmuse is not for under-18s and we do not knowingly collect their
          data. If you believe a child has an account, contact us and we will
          remove it.
        </p>
      </Section>

      <Section heading="Changes and contact">
        <p>
          If this policy changes materially we will update the date above and
          notify account holders. For anything privacy-related, email{" "}
          <a className="text-brand underline-offset-4 hover:underline" href={`mailto:${LEGAL_CONTACT}`}>
            {LEGAL_CONTACT}
          </a>
          . See also our{" "}
          <Link className="text-brand underline-offset-4 hover:underline" href="/terms">
            Terms of Service
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
