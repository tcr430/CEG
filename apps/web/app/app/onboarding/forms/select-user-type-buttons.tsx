"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

import { selectOnboardingUserTypeAction } from "../actions";

type UserTypeOption = {
  value: "agency" | "sdr" | "saas_founder" | "basic";
  label: string;
  helper: string;
};

const OPTIONS: ReadonlyArray<UserTypeOption> = [
  {
    value: "agency",
    label: "Outbound agency",
    helper: "Recommended for most teams in this product",
  },
  {
    value: "sdr",
    label: "SDR team",
    helper: "Best for one internal outbound motion with team review",
  },
  {
    value: "saas_founder",
    label: "SaaS founder",
    helper: "Best for founder-led setup with tighter context",
  },
  {
    value: "basic",
    label: "Basic mode",
    helper: "Fastest path when you want to skip sender setup first",
  },
];

type Props = {
  workspaceId: string;
  currentSelection: "agency" | "sdr" | "saas_founder" | "basic" | null;
  senderProfilesAllowed: boolean;
};

export function SelectUserTypeButtons({
  workspaceId,
  currentSelection,
  senderProfilesAllowed,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const select = (value: UserTypeOption["value"]) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("workspaceId", workspaceId);
      formData.append("userType", value);

      const result = await selectOnboardingUserTypeAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("User type saved.");
      router.refresh();
    });
  };

  return (
    <div className="onboardingChoiceGrid">
      {OPTIONS.map((option) => {
        const blocked = option.value !== "basic" && !senderProfilesAllowed;
        const isCurrent = currentSelection === option.value;
        return (
          <Button
            key={option.value}
            type="button"
            variant="secondary"
            className="onboardingChoiceButton"
            disabled={blocked || isPending}
            onClick={() => select(option.value)}
          >
            {option.label}
            <small>
              {blocked
                ? "Unavailable on this plan"
                : isCurrent
                  ? "Current selection"
                  : option.helper}
            </small>
          </Button>
        );
      })}
    </div>
  );
}
