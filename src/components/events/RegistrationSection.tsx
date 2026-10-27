"use client";

import { useState, type ComponentProps } from "react";
import { RegistrationForm } from "@/components/events/RegistrationForm";

type Props = Omit<ComponentProps<typeof RegistrationForm>, "onRegisterAnother">;

/** Owns the "start again" reset: changing the key remounts the form with a clean slate. */
export function RegistrationSection(props: Props) {
  const [round, setRound] = useState(0);

  return (
    <RegistrationForm
      key={round}
      {...props}
      onRegisterAnother={() => {
        setRound((value) => value + 1);
        document.getElementById("register")?.scrollIntoView({ behavior: "smooth" });
      }}
    />
  );
}
