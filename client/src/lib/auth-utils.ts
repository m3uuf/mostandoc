export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*/.test(error.message) || error.message.includes("غير مصرح");
}

export function redirectToLogin(toast?: (options: { title: string; description: string; variant: string }) => void) {
  if (toast) {
    toast({
      title: "غير مصرح",
      description: "يرجى تسجيل الدخول للمتابعة",
      variant: "destructive",
    });
  }
  setTimeout(() => {
    window.location.href = "/auth";
  }, 500);
}
