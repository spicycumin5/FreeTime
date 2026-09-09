import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Free Time",
};

const CONTACT_EMAIL = "hankyumin5@gmail.com";
const LAST_UPDATED = "September 9, 2026";

const linkClass = "underline underline-offset-2 hover:text-foreground";
const h2Class = "mt-6 text-lg font-semibold tracking-tight";
const pClass = "text-sm leading-relaxed text-muted-foreground";
const ulClass = "list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground";

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
      </div>

      <p className={pClass}>
        Free Time is a small app for coordinating group activities with friends. This policy
        explains what information the app collects, why, and how it&apos;s used.
      </p>

      <h2 className={h2Class}>Information we collect</h2>
      <ul className={ulClass}>
        <li>
          <strong className="text-foreground">From Google Sign-In:</strong> your name, email
          address, and profile picture, via the <code>openid</code>, <code>email</code>, and{" "}
          <code>profile</code> scopes.
        </li>
        <li>
          <strong className="text-foreground">Information you provide directly:</strong> party
          names, activity details (title, description, date range), the availability you mark on
          the grid, and any movie suggestions or votes you submit.
        </li>
      </ul>

      <h2 className={h2Class}>How we use this information</h2>
      <p className={pClass}>
        We use it only to run the app&apos;s features: matching everyone&apos;s availability,
        showing movie search results, and emailing reminders when a recurring activity opens a
        new round. Once a time is confirmed, we generate a pre-filled &quot;Add to Google
        Calendar&quot; link for each party member to add the event to their own calendar
        themselves — the app never creates events or sends invites on your behalf, and never
        requests access to your Google Calendar. We don&apos;t sell your data, use it for
        advertising, or run any analytics or tracking scripts on this site.
      </p>

      <h2 className={h2Class}>Who can see your information</h2>
      <p className={pClass}>
        Other members of a party you join can see your name, profile picture, and the
        availability and movie data you submit within that party. This is core to how the app
        works — it&apos;s built for coordinating with people you already know.
      </p>

      <h2 className={h2Class}>Third-party services we use</h2>
      <ul className={ulClass}>
        <li>
          <strong className="text-foreground">Google</strong> — sign-in only, as described
          above. We never connect to your Google Calendar.
        </li>
        <li>
          <strong className="text-foreground">The Movie Database (TMDB)</strong> — powers movie
          search and poster images; only your search text is sent, no account information.
        </li>
        <li>
          <strong className="text-foreground">Resend</strong> — delivers reminder emails for
          recurring activities; the recipients&apos; email addresses and activity details are
          sent to Resend to deliver these emails.
        </li>
        <li>
          <strong className="text-foreground">Neon</strong> and{" "}
          <strong className="text-foreground">Vercel</strong> — host the app&apos;s database and
          the app itself.
        </li>
      </ul>

      <h2 className={h2Class}>Data retention and deletion</h2>
      <p className={pClass}>
        Your data is kept for as long as your account and party memberships exist. To request
        deletion of your account and associated data, email{" "}
        <a className={linkClass} href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>

      <h2 className={h2Class}>Children&apos;s privacy</h2>
      <p className={pClass}>Free Time is not directed at, or knowingly used by, children under 13.</p>

      <h2 className={h2Class}>Changes to this policy</h2>
      <p className={pClass}>If this policy changes, we&apos;ll update the date at the top of this page.</p>

      <h2 className={h2Class}>Contact</h2>
      <p className={pClass}>
        Questions about this policy or your data can be sent to{" "}
        <a className={linkClass} href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </div>
  );
}
