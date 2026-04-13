const en = {
  metadata: {
    title: "Guild Engine",
    description: "Kickstart your Guild Engine project with Next.js.",
  },
  home: {
    heading: "To get started, edit the page.tsx file.",
    introBeforeTemplate:
      "Looking for a starting point or more instructions? Head over to",
    templateLinkLabel: "Templates",
    introMiddle: "or the",
    learningLinkLabel: "Learning",
    introAfter: "center.",
    deployButton: "Deploy Now",
    docsButton: "Documentation",
    toggleToLight: "Light mode",
    toggleToDark: "Dark mode",
  },
  topbar: {
    brand: "Guild Engine",
    languageButton: "Switch language",
    english: "English",
    german: "Deutsch",
    toggleToLight: "Switch to light mode",
    toggleToDark: "Switch to dark mode",
    logoutButton: "Log out",
  },
  login: {
    heading: "Sign in",
    usernameLabel: "Username",
    usernamePlaceholder: "Enter your username",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    submitButton: "Sign in",
    invalidCredentials: "Invalid username or password.",
  },
} as const;

export default en;

