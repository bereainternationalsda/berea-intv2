// DRAFT wording for the church to review. Keep PRIVACY_NOTICE_VERSION in
// src/lib/events/registration.ts in step with any change to what this says, so
// each registration records which version the person agreed to.

export function PrivacyNotice({
  eventTitle,
  contactName,
  contactPhone,
}: {
  eventTitle: string;
  contactName?: string;
  contactPhone?: string;
}) {
  const contact =
    contactName || contactPhone
      ? [contactName, contactPhone].filter(Boolean).join(" on ")
      : "the church office";

  return (
    <details className="rounded-xl border border-navy-100 bg-navy-50 p-4 text-sm text-navy-800">
      <summary className="cursor-pointer font-semibold text-navy-900">
        Read the privacy notice
      </summary>
      <div className="mt-3 space-y-3 leading-relaxed">
        <p>
          <strong>Who we are.</strong> Berea International Seventh-day Adventist
          Church (&ldquo;the church&rdquo;) is responsible for the information you give
          on this form, and handles it in line with the Protection of Personal
          Information Act (POPIA).
        </p>
        <p>
          <strong>What we collect.</strong> Your name, phone number and email address;
          an emergency contact; and the name, age (or age range) and any dietary needs
          or allergies of each person you register.
        </p>
        <p>
          <strong>Why.</strong> Only to organise &ldquo;{eventTitle}&rdquo;: to contact
          you about it, plan accommodation, meals and activities, and look after
          everyone&rsquo;s safety.
        </p>
        <p>
          <strong>Who sees it.</strong> The church&rsquo;s event organisers only. We do
          not sell it or share it with anyone outside the church, unless the law
          requires us to.
        </p>
        <p>
          <strong>How long we keep it.</strong> Only as long as needed to run the event.
          After that we delete it.
        </p>
        <p>
          <strong>Your rights.</strong> You can ask to see, correct or delete your
          information at any time by contacting {contact}. You may also complain to the
          Information Regulator.
        </p>
        <p>
          <strong>Children.</strong> If you register anyone under 18, you confirm that
          you are their parent or legal guardian, or that you have their guardian&rsquo;s
          permission to register them.
        </p>
      </div>
    </details>
  );
}
