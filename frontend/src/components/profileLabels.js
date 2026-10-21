export const genderOptions = [
  { value: "0", label: "Chưa rõ" },
  { value: "1", label: "Nam" },
  { value: "2", label: "Nữ" },
  { value: "3", label: "Khác" },
];

export const maritalOptions = [
  { value: "0", label: "Chưa rõ" },
  { value: "1", label: "Độc thân" },
  { value: "2", label: "Đã kết hôn" },
  { value: "3", label: "Ly hôn" },
  { value: "4", label: "Góa" },
];

export function optionLabel(options, value) {
  return options.find((item) => item.value === String(value ?? "0"))?.label || "Chưa rõ";
}

export function formatDay(value) {
  if (!value) {
    return "—";
  }
  const [year, month, day] = String(value).slice(0, 10).split("-");
  if (!year || !month || !day) {
    return "—";
  }
  return `${day}/${month}/${year}`;
}

export function formatDateTime(value) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  const day = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${day} · ${time}`;
}

export const emptyProfileForm = {
  userId: "",
  fullName: "",
  dateOfBirth: "",
  gender: "0",
  identityNumber: "",
  identityIssuedDate: "",
  identityIssuedPlace: "",
  phoneNumber: "",
  email: "",
  address: "",
  permanentAddress: "",
  provinceCode: "",
  wardCode: "",
  placeOfBirth: "",
  nationality: "Việt Nam",
  ethnicity: "",
  religion: "",
  maritalStatus: "0",
  avatarUrl: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  educationLevel: "",
  note: "",
};

export function profileToForm(profile) {
  return {
    userId: profile.userId ? String(profile.userId) : "",
    fullName: profile.fullName || "",
    dateOfBirth: profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : "",
    gender: String(profile.gender ?? 0),
    identityNumber: profile.identityNumber || "",
    identityIssuedDate: profile.identityIssuedDate ? String(profile.identityIssuedDate).slice(0, 10) : "",
    identityIssuedPlace: profile.identityIssuedPlace || "",
    phoneNumber: profile.phoneNumber || "",
    email: profile.email || "",
    address: profile.address || "",
    permanentAddress: profile.permanentAddress || "",
    provinceCode: profile.provinceCode || "",
    wardCode: profile.wardCode || "",
    placeOfBirth: profile.placeOfBirth || "",
    nationality: profile.nationality || "",
    ethnicity: profile.ethnicity || "",
    religion: profile.religion || "",
    maritalStatus: String(profile.maritalStatus ?? 0),
    avatarUrl: profile.avatarUrl || "",
    emergencyContactName: profile.emergencyContactName || "",
    emergencyContactPhone: profile.emergencyContactPhone || "",
    educationLevel: profile.educationLevel || "",
    note: profile.note || "",
  };
}

function orNull(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

export function formToPayload(form) {
  return {
    userId: Number(form.userId),
    fullName: form.fullName.trim(),
    dateOfBirth: orNull(form.dateOfBirth),
    gender: Number(form.gender),
    identityNumber: orNull(form.identityNumber),
    identityIssuedDate: orNull(form.identityIssuedDate),
    identityIssuedPlace: orNull(form.identityIssuedPlace),
    phoneNumber: orNull(form.phoneNumber),
    email: orNull(form.email),
    address: orNull(form.address),
    permanentAddress: orNull(form.permanentAddress),
    provinceCode: orNull(form.provinceCode),
    wardCode: orNull(form.wardCode),
    placeOfBirth: orNull(form.placeOfBirth),
    nationality: orNull(form.nationality),
    ethnicity: orNull(form.ethnicity),
    religion: orNull(form.religion),
    maritalStatus: Number(form.maritalStatus),
    avatarUrl: orNull(form.avatarUrl),
    emergencyContactName: orNull(form.emergencyContactName),
    emergencyContactPhone: orNull(form.emergencyContactPhone),
    educationLevel: orNull(form.educationLevel),
    note: orNull(form.note),
  };
}
