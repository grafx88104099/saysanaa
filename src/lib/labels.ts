import type {
  ProjectStatus,
  ProjectType,
  Role,
  SkillLevel,
  TaskPriority,
  TaskStatus,
} from "@prisma/client";

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

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  DESIGN: "Зураг төсөл",
  BUILD: "Засал гүйцэтгэл",
};

export const PROJECT_TYPES: ProjectType[] = ["DESIGN", "BUILD"];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  DRAFT: "Ноорог",
  ACTIVE: "Идэвхтэй",
  ON_HOLD: "Түр зогссон",
  COMPLETED: "Дууссан",
  CANCELLED: "Цуцалсан",
};

export const PROJECT_STATUSES: ProjectStatus[] = [
  "DRAFT",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
];

export const PURPOSE_OPTIONS = [
  "Оффис",
  "Апартмент",
  "Орон сууц",
  "Ресторан",
  "Дэлгүүр",
  "Зочид буудал",
  "Эмнэлэг",
  "Боловсрол",
  "Бусад",
];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "Хийгээгүй",
  DOING: "Хийгдэж буй",
  REVIEW: "Хяналт",
  DONE: "Дууссан",
  BLOCKED: "Саатсан",
};

export const TASK_STATUSES: TaskStatus[] = ["TODO", "DOING", "REVIEW", "DONE", "BLOCKED"];

export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  TODO: "#8B919C",
  DOING: "#8B95FF",
  REVIEW: "#E5B85C",
  DONE: "#3FCF8E",
  BLOCKED: "#E07474",
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Бага",
  NORMAL: "Дунд",
  HIGH: "Өндөр",
};

export const TASK_PRIORITIES: TaskPriority[] = ["LOW", "NORMAL", "HIGH"];

export function priorityAccent(priority: number): { color: string; tone: string } {
  if (priority >= 9) return { color: "#E07474", tone: "Маш яаралтай" };
  if (priority >= 7) return { color: "#E5B85C", tone: "Яаралтай" };
  if (priority >= 4) return { color: "#8B95FF", tone: "Дунд зэрэг чухал" };
  return { color: "#8B919C", tone: "Хэвийн" };
}

