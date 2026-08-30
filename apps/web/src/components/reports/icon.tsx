import Image from "next/image";

const iconSrc = {
  calendar: "/assets/reports/icon-calendar.svg",
  chart: "/assets/reports/icon-chart.svg",
  checkout: "/assets/reports/icon-checkout.svg",
  chevronDown: "/assets/reports/icon-chevron-down.svg",
  chevronLeft: "/assets/reports/icon-chevron-left.svg",
  chevronRight: "/assets/reports/icon-chevron-right.svg",
  clear: "/assets/reports/icon-clear.svg",
  copy: "/assets/reports/icon-copy.svg",
  download: "/assets/reports/icon-download.svg",
} as const;

type IconName = keyof typeof iconSrc;

export function Icon({ name, label, size = 16 }: { name: IconName; label?: string; size?: number }) {
  return (
    <Image
      aria-hidden={label ? undefined : true}
      alt={label ?? ""}
      height={size}
      src={iconSrc[name]}
      width={size}
    />
  );
}
