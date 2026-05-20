import type { Role, SkillLevel } from "@prisma/client";

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Админ",
  PM: "Төслийн менежер",
  DESIGNER: "Дизайнер",
  ACCOUNTANT: "Нягтлан",
  CLIENT: "Захиалагч",
};

export const ROLES: Role[] = ["ADMIN", "PM", "DESIGNER", "ACCOUNTANT", "CLIENT"];

export const SKILL_LABEL: Record<SkillLevel, string> = {
  NONE: "Үгүй",
  BASIC: "Анхан",
  INTERMEDIATE: "Дунд",
  ADVANCED: "Гүнзгий",
  EXPERT: "Мэргэжлийн",
};

export const SKILL_LEVELS: SkillLevel[] = ["NONE", "BASIC", "INTERMEDIATE", "ADVANCED", "EXPERT"];

export const LANGUAGE_OPTIONS = [
  { code: "mn", label: "Монгол" },
  { code: "en", label: "Англи" },
  { code: "ru", label: "Орос" },
  { code: "zh", label: "Хятад" },
  { code: "ja", label: "Япон" },
  { code: "ko", label: "Солонгос" },
];

export function languageLabel(code: string) {
  return LANGUAGE_OPTIONS.find((l) => l.code === code)?.label ?? code;
}

export function roleChip(role: Role) {
  const map: Record<Role, string> = {
    ADMIN: "chip-red",
    PM: "chip-blue",
    DESIGNER: "chip-green",
    ACCOUNTANT: "chip-amber",
    CLIENT: "chip-gray",
  };
  return map[role];
}
