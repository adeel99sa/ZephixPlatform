import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { cn } from "../../utils/cn";

type Props = React.ComponentProps<typeof RouterLink>;

export function Link(props: Props) {
  return (
    <RouterLink
      {...props}
      className={cn("text-link hover:underline focus-visible:outline-none", props.className)}
    />
  );
}
