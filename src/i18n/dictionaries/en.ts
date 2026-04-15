const en = {
  metadata: {
    title: "Guild Engine",
    description: "Kickstart your Guild Engine project with Next.js.",
  },
  home: {
    heading: "Leaderboard",
    empty: "No users available.",
  },
  leaderboard: {
    individual: {
      heading: "Individual Leaderboard",
      empty: "No users available.",
    },
    team: {
      heading: "Team Leaderboard",
      empty: "No teams available.",
    },
  },
  topbar: {
    brand: "Guild Engine",
    leaderboardLink: "Leaderboard",
    individualLeaderboardLink: "Individual Leaderboard",
    teamLeaderboardLink: "Team Leaderboard",
    getPointsLink: "Get Points",
    adminLink: "Admin",
    pointDistributionLink: "Point Distribution",
    guildMeetingsLink: "Guild Meetings",
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
      "Did you attend the guild meeting on {date} (only counts if you arrived before the protocol raffle)?",
    attendanceNo: "No",
    attendanceVirtually: "Yes, virtually",
    attendanceOnSite: "Yes, on site",
    protocolLabel: "Did you write the protocol for the guild meeting on {date}?",
    protocolNo: "No",
    protocolForced: "Yes, forced",
    protocolVoluntary: "Yes, voluntarily",
    moderationLabel: "Did you moderate the guild meeting on {date}?",
    yes: "Yes",
    no: "No",
    participationLabel:
      "Did you actively participate in at least one working group during the weeks leading up to the guild meeting on {date}?",
    twlPostsLabel:
      "Did you write any TWL (Today We Learned) or Security News posts during the weeks leading up to the guild meeting on {date}?",
    presentationsLabel:
      "Did you present any project or concept during the guild meeting on {date}?",
    noMeetingError: "No matching guild meeting found. Please contact your administrator.",
    previousMeetingButton: "Previous guild meeting",
    nextMeetingButton: "Next guild meeting",
    meetingDateButton: "Select guild meeting date",
    loading: "Loading...",
    lastModified: "Last modified",
    never: "Never",
    cancelButton: "Reset",
    saveButton: "Save",
    saveSuccess: "Saved successfully.",
    saveError: "Could not save your submission. Please try again.",
  },
  admin: {
    pointDistributionPageTitle: "Point Distribution",
    guildMeetingsPageTitle: "Guild Meetings",
  },
} as const;

export default en;
