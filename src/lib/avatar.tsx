import { createAvatar } from "@dicebear/core";
import { botttsNeutral, initials } from "@dicebear/collection";

export type AvatarVariant = "botttsNeutral" | "initials";

export const generateAvatar = (
  seed: string,
  variant: AvatarVariant = "initials",
) => {
  const options =
    variant === "botttsNeutral"
      ? { seed }
      : { seed, fontWeight: 500, fontSize: 42 };

  const collection = variant === "botttsNeutral" ? botttsNeutral : initials;

  return createAvatar(collection, options).toDataUri();
};
