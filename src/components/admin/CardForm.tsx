"use client";

import { useActionState, useState } from "react";
import { saveMinistry, saveSection } from "@/app/admin/(panel)/actions";
import {
  SelectField,
  StatusBanner,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/admin/fields";
import { ImageField } from "@/components/admin/ImageField";
import { idleState, type AdminCard } from "@/lib/admin/types";
import { slugify } from "@/lib/admin/validation";

type CardFormProps = {
  kind: "section" | "ministry";
  mode: "create" | "edit";
  initial: AdminCard;
  /** Needed for ministries, so a card can be moved between sections. */
  sections?: AdminCard[];
};

export function CardForm({ kind, mode, initial, sections = [] }: CardFormProps) {
  const isMinistry = kind === "ministry";
  const isCreate = mode === "create";

  const [state, action, pending] = useActionState(
    isMinistry ? saveMinistry : saveSection,
    idleState,
  );
  const [imageBusy, setImageBusy] = useState(false);

  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState(initial.description ?? "");
  const [icon, setIcon] = useState(initial.icon ?? "");
  const [order, setOrder] = useState(String(initial.order));
  const [sectionSlug, setSectionSlug] = useState(
    initial.sectionSlug ?? sections[0]?.slug ?? "",
  );

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  function handleTitleChange(value: string) {
    setTitle(value);
    if (isCreate && !slugEdited) setSlug(slugify(value));
  }

  return (
    <form action={action} className="space-y-6">
      <StatusBanner state={state} />

      <input type="hidden" name="mode" value={mode} />
      {!isCreate && <input type="hidden" name="slug" value={initial.slug} />}

      <TextField
        name="title"
        label="Title"
        value={title}
        onChange={handleTitleChange}
        maxLength={isMinistry ? 80 : 60}
        required
        error={errors.title}
      />

      {isMinistry && isCreate && (
        <TextField
          name="slug"
          label="Web address"
          hint={`This card's page will be at /…/${slug || "your-title"}. It can't be changed after you create the card.`}
          value={slug}
          onChange={(value) => {
            setSlugEdited(true);
            setSlug(slugify(value));
          }}
          maxLength={60}
          error={errors.slug}
        />
      )}

      {isMinistry && (
        <SelectField
          name="sectionSlug"
          label="Section"
          hint="Which page this card appears on."
          value={sectionSlug}
          onChange={setSectionSlug}
          resetKey={state.status === "idle" ? "idle" : state.at}
          options={sections.map((section) => ({
            value: section.slug,
            label: section.title,
          }))}
          error={errors.sectionSlug}
        />
      )}

      <TextAreaField
        name="description"
        label="Description"
        hint={
          isMinistry
            ? "Shown on the card and on the card's own page."
            : "The short text on the homepage card."
        }
        value={description}
        onChange={setDescription}
        maxLength={isMinistry ? 1000 : 300}
        rows={isMinistry ? 6 : 3}
        error={errors.description}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          name="icon"
          label="Icon (emoji)"
          hint="Shown when the card has no image."
          value={icon}
          onChange={setIcon}
          maxLength={16}
          placeholder="🧭"
          error={errors.icon}
        />
        <TextField
          name="order"
          label="Display order"
          hint="Smaller numbers appear first."
          type="number"
          value={order}
          onChange={setOrder}
          error={errors.order}
        />
      </div>

      {/* Re-mounted after every response, because React clears the file input. */}
      <ImageField
        key={state.status === "idle" ? "idle" : state.at}
        label="Card image"
        hint="A landscape photo works best (shown at 4:3)."
        currentUrl={initial.imageUrl}
        error={errors.image}
        onBusyChange={setImageBusy}
      />

      <SubmitButton busy={pending || imageBusy}>
        {pending
          ? "Saving…"
          : imageBusy
            ? "Preparing image…"
            : isCreate
              ? "Create card"
              : "Save changes"}
      </SubmitButton>
    </form>
  );
}
