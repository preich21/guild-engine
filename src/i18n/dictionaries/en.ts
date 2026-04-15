const en = {
  metadata: {
    title: "Guild Engine",
    description: "Kickstart your Guild Engine project with Next.js.",
  },
  home: {
    heading: "Leaderboard",
    empty: "No users available.",
  },
  topbar: {
    brand: "Guild Engine",
    getPointsLink: "Get Points",
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
  getPoints: {
    heading: "Get points",
    attendanceLabel:
      "Did you attend the last guild meeting (only counts if you arrived before the protocol raffle)?",
    attendanceNo: "No",
    attendanceVirtually: "Yes, virtually",
    attendanceOnSite: "Yes, on site",
    protocolLabel: "Did you write the protocol for the last guild meeting?",
    protocolNo: "No",
    protocolForced: "Yes, forced",
    protocolVoluntary: "Yes, voluntarily",
    moderationLabel: "Did you moderate the last guild meeting?",
    yes: "Yes",
    no: "No",
    participationLabel:
      "Did you actively participate in at least one working group between the last two guild meetings?",
    twlPostsLabel:
      "Did you write any TWL (Today We Learned) or Security News posts between the last two guild meetings?",
    presentationsLabel:
      "Did you present any project or concept during the last guild meeting?",
    noMeetingError: "No matching guild meeting found. Please contact your administrator.",
    lastModified: "Last modified",
    never: "Never",
    cancelButton: "Reset",
    saveButton: "Save",
    saveSuccess: "Saved successfully.",
    saveError: "Could not save your submission. Please try again.",
  },
} as const;

export default en;

