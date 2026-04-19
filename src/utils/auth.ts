import api, { API_ORIGIN } from "../services/api";

type UnknownRecord = Record<string, any>;

export interface AuthResult {
  success: boolean;
  user: UnknownRecord | null;
  token: string | null;
  isNewUser: boolean;
  needsProfileCompletion: boolean;
  message: string;
}

const normalizeBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["1", "true", "yes", "new", "required"].includes(normalized);
  }
  return false;
};

const safeParseJson = (value: unknown) => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const pickUser = (payload: UnknownRecord) => {
  const rawUser =
    payload.user ??
    payload.data?.user ??
    payload.result?.user ??
    payload.profile ??
    null;

  const parsedUser = safeParseJson(rawUser);
  return parsedUser && typeof parsedUser === "object" ? parsedUser : null;
};

export const extractAuthResult = (payload: unknown): AuthResult => {
  const source =
    payload && typeof payload === "object" ? (payload as UnknownRecord) : {};

  const user = pickUser(source);
  const token =
    source.token ??
    source.access_token ??
    source.accessToken ??
    source.jwt ??
    source.data?.token ??
    source.data?.access_token ??
    source.result?.token ??
    user?.token ??
    null;

  const isNewUser = normalizeBoolean(
    source.is_new_user ??
      source.isNewUser ??
      source.new_user ??
      source.newUser ??
      source.data?.is_new_user ??
      source.data?.isNewUser
  );

  const profileCompleted = normalizeBoolean(
    user?.profile_completed ??
      user?.profileComplete ??
      user?.is_profile_complete ??
      source.profile_completed ??
      source.profileComplete ??
      source.is_profile_complete
  );

  const needsProfileCompletion =
    normalizeBoolean(
      source.needs_profile_completion ??
        source.needsProfileCompletion ??
        source.complete_profile ??
        source.completeProfile ??
        source.requires_profile_completion ??
        source.requiresProfileCompletion ??
        user?.needs_profile_completion ??
        user?.needsProfileCompletion
    ) || (isNewUser && !profileCompleted);

  return {
    success: Boolean(source.success ?? user ?? token),
    user,
    token: typeof token === "string" ? token : null,
    isNewUser,
    needsProfileCompletion,
    message:
      source.message ||
      source.error ||
      source.data?.message ||
      "تعذر إكمال تسجيل الدخول.",
  };
};

export const saveAuthSession = (result: AuthResult) => {
  if (!result.user) return;

  const userToStore = result.token
    ? { ...result.user, token: result.token }
    : result.user;

  localStorage.setItem("user", JSON.stringify(userToStore));

  if (result.token) {
    localStorage.setItem("token", result.token);
  }

  if (userToStore?.branch_id) {
    localStorage.setItem("branch_id", String(userToStore.branch_id));
  }
};

export const getPostLoginPath = (result: AuthResult) =>
  result.needsProfileCompletion ? "/complete-profile" : "/";

export const getGoogleLoginUrl = () => {
  const callbackUrl = `${window.location.origin}/auth/callback`;
  const url = new URL(`${API_ORIGIN}/api/auth/google`);

  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("frontend_redirect_uri", callbackUrl);

  return url.toString();
};

export const exchangeGoogleCallback = async (search: string) => {
  const endpoints = [
    `/auth/google/callback${search}`,
    `/auth/google/verify${search}`,
  ];

  let lastError: any = null;

  for (const endpoint of endpoints) {
    try {
      const res = await api.get(endpoint);
      return res.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

export const completeProfile = async (payload: {
  name: string;
  phone: string;
  email?: string;
}) => {
  const endpoints = [
    "/auth/complete-profile",
    "/auth/complete-registration",
    "/auth/google/complete-profile",
  ];

  let lastError: any = null;

  for (const endpoint of endpoints) {
    try {
      const res = await api.post(endpoint, payload);
      return res.data;
    } catch (error: any) {
      const status = error?.response?.status;

      if (status && status !== 404) {
        throw error;
      }

      lastError = error;
    }
  }

  throw lastError;
};
