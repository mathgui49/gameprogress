import { type SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, className, ...props }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} {...props} />;
}

export function IconMapPin(p: IconProps) {
  return <Icon {...p}><path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></Icon>;
}

export function IconBarChart(p: IconProps) {
  return <Icon {...p}><path d="M3 3v18h18" /><path d="M7 16V8" /><path d="M11 16V4" /><path d="M15 16v-5" /><path d="M19 16v-2" /></Icon>;
}

export function IconSparkles(p: IconProps) {
  return <Icon {...p}><path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" /></Icon>;
}

export function IconStar(p: IconProps) {
  return <Icon {...p}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></Icon>;
}

export function IconCalendar(p: IconProps) {
  return <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></Icon>;
}

export function IconTarget(p: IconProps) {
  return <Icon {...p}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Icon>;
}

export function IconPenLine(p: IconProps) {
  return <Icon {...p}><path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 013.002 3.002L7.368 18.635a2 2 0 01-.855.506l-2.872.838.838-2.872a2 2 0 01.506-.855L16.376 3.622z" /></Icon>;
}

export function IconUsers(p: IconProps) {
  return <Icon {...p}><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></Icon>;
}

export function IconMessageCircle(p: IconProps) {
  return <Icon {...p}><path d="M7.9 20A9 9 0 104 16.1L2 22z" /></Icon>;
}

export function IconFlame(p: IconProps) {
  return <Icon {...p} fill="currentColor" stroke="none"><path d="M12 22c4.97 0 8-3.58 8-8 0-2.52-1.64-5.2-3-6.82a.5.5 0 00-.82.13c-.33.76-.81 1.42-1.43 1.94C14.32 6.12 13.26 2.44 12 2a.5.5 0 00-.6.2C9.8 4.94 8 8.14 8 11c0 .86.13 1.68.38 2.44a.5.5 0 01-.84.48C6.56 12.86 6 11.54 6 10a.5.5 0 00-.87-.34C4.12 10.73 4 12.87 4 14c0 4.42 3.03 8 8 8z" /></Icon>;
}

export function IconLock(p: IconProps) {
  return <Icon {...p}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></Icon>;
}

export function IconTrendingUp(p: IconProps) {
  return <Icon {...p}><path d="M22 7l-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></Icon>;
}

export function IconZap(p: IconProps) {
  return <Icon {...p} fill="currentColor" stroke="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></Icon>;
}

export function IconShield(p: IconProps) {
  return <Icon {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Icon>;
}

export function IconAward(p: IconProps) {
  return <Icon {...p}><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" /></Icon>;
}

export function IconPlus(p: IconProps) {
  return <Icon {...p}><path d="M12 5v14" /><path d="M5 12h14" /></Icon>;
}

export function IconChevronLeft(p: IconProps) {
  return <Icon {...p}><path d="M15 18l-6-6 6-6" /></Icon>;
}

export function IconSettings(p: IconProps) {
  return <Icon {...p}><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" /><circle cx="12" cy="12" r="3" /></Icon>;
}

export function IconCrown(p: IconProps) {
  return <Icon {...p}><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" /><path d="M5 16h14v2a2 2 0 01-2 2H7a2 2 0 01-2-2v-2z" /></Icon>;
}

export function IconBrain(p: IconProps) {
  return <Icon {...p}><path d="M9.5 2A5.5 5.5 0 005 6.36V6.5A5.5 5.5 0 008 17.5V22h2V12h4v10h2v-4.5a5.5 5.5 0 003-11V6.36A5.5 5.5 0 0014.5 2h-5z" /></Icon>;
}

export function IconHeart(p: IconProps) {
  return <Icon {...p}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7 7-7z" /></Icon>;
}

export function IconActivity(p: IconProps) {
  return <Icon {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></Icon>;
}

export function IconClipboardCheck(p: IconProps) {
  return <Icon {...p}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><path d="M9 14l2 2 4-4" /></Icon>;
}
