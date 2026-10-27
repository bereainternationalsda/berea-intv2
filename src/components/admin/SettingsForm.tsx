"use client";

import { useActionState, useState } from "react";
import { saveSettings } from "@/app/admin/(panel)/actions";
import {
  StatusBanner,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/admin/fields";
import { ImageField } from "@/components/admin/ImageField";
import { idleState } from "@/lib/admin/types";
import type { SiteSettings } from "@/lib/fallback-data";

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const [state, action, pending] = useActionState(saveSettings, idleState);
  const [imageBusy, setImageBusy] = useState(false);

  const [heroHeadline, setHeroHeadline] = useState(initial.heroHeadline);
  const [heroEyebrow, setHeroEyebrow] = useState(initial.heroEyebrow ?? "");
  const [heroSubtitle, setHeroSubtitle] = useState(initial.heroSubtitle ?? "");

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} className="space-y-6">
      <StatusBanner state={state} />

      {/* Re-mounted after every response, because React clears the file input. */}
      <ImageField
        key={state.status === "idle" ? "idle" : state.at}
        label="Hero image"
        hint="The big photo behind the homepage heading. A wide, landscape photo at least 1600 px across works best."
        currentUrl={initial.heroImageUrl}
        error={errors.image}
        aspectClass="aspect-video"
        onBusyChange={setImageBusy}
      />

      <TextField
        name="heroEyebrow"
        label="Small heading"
        hint="The short line above the main heading, e.g. “Welcome home”."
        value={heroEyebrow}
        onChange={setHeroEyebrow}
        maxLength={60}
        error={errors.heroEyebrow}
      />
      <TextField
        name="heroHeadline"
        label="Main heading"
        value={heroHeadline}
        onChange={setHeroHeadline}
        maxLength={120}
        required
        error={errors.heroHeadline}
      />
      <TextAreaField
        name="heroSubtitle"
        label="Subtitle"
        hint="One or two sentences under the heading."
        value={heroSubtitle}
        onChange={setHeroSubtitle}
        maxLength={400}
        rows={3}
        error={errors.heroSubtitle}
      />

      <SubmitButton busy={pending || imageBusy}>
        {pending ? "Saving…" : imageBusy ? "Preparing image…" : "Save changes"}
      </SubmitButton>
    </form>
  );
}
