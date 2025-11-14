"use client";

import { Building, Network, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface WorkspaceIconProps {
  isPersonal: boolean;
  role: "owner" | "member";
  size?: number;
  className?: string;
}

export function WorkspaceIcon({
  isPersonal,
  role,
  size = 32,
  className,
}: WorkspaceIconProps) {
  let Icon: LucideIcon;
  let colorClass: string;

  if (isPersonal) {
    Icon = User;
    colorClass = "text-blue-500";
  } else if (role === "owner") {
    Icon = Building;
    colorClass = "text-purple-500";
  } else {
    Icon = Network;
    colorClass = "text-green-500";
  }

  const iconSize = size / 2;

  return (
    <div
      className={cn(
        "rounded-md flex items-center justify-center ",
        colorClass,
        className
      )}
      style={{ width: size, height: size }}
    >
      <Icon style={{ width: iconSize, height: iconSize }} />
    </div>
  );
}

