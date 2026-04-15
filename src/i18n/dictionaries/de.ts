const de = {
  metadata: {
    title: "Guild Engine",
    description: "Starte dein Guild-Engine-Projekt mit Next.js.",
  },
  home: {
    heading: "Rangliste",
    empty: "Keine Benutzer verfügbar.",
  },
  leaderboard: {
    individual: {
      heading: "Individuelle Rangliste",
      empty: "Keine Benutzer verfügbar.",
    },
    team: {
      heading: "Team-Rangliste",
      empty: "Keine Teams verfügbar.",
    },
  },
  topbar: {
    brand: "Guild Engine",
    leaderboardLink: "Rangliste",
    individualLeaderboardLink: "Individuelle Rangliste",
    teamLeaderboardLink: "Team-Rangliste",
    getPointsLink: "Punkte Erfassen",
    adminLink: "Admin",
    pointDistributionLink: "Punkteverteilung",
    guildMeetingsLink: "Gildentreffen",
    languageButton: "Sprache wechseln",
    english: "English",
    german: "Deutsch",
    toggleToLight: "Zum hellen Modus wechseln",
    toggleToDark: "Zum dunklen Modus wechseln",
    logoutButton: "Abmelden",
  },
  login: {
    heading: "Anmelden",
    usernameLabel: "Benutzername",
    usernamePlaceholder: "Benutzernamen eingeben",
    passwordLabel: "Passwort",
    passwordPlaceholder: "Passwort eingeben",
    submitButton: "Anmelden",
    invalidCredentials: "Ungultiger Benutzername oder Passwort.",
  },
  getPoints: {
    heading: "Punkte erfassen",
    attendanceLabel:
      "Hast du am Gildentreff am {date} teilgenommen (zählt nur, wenn du vor der Protokollverlosung da warst)?",
    attendanceNo: "Nein",
    attendanceVirtually: "Ja, virtuell",
    attendanceOnSite: "Ja, vor Ort",
    protocolLabel: "Hast du das Protokoll für den Gildentreff am {date} geschrieben?",
    protocolNo: "Nein",
    protocolForced: "Ja, gezwungen",
    protocolVoluntary: "Ja, freiwillig",
    moderationLabel: "Hast du den Gildentreff am {date} moderiert?",
    yes: "Ja",
    no: "Nein",
    participationLabel:
      "Hast du in den Wochen vor dem Gildentreff am {date} aktiv in mindestens einer Arbeitsgruppe mitgemacht?",
    twlPostsLabel:
      "Hast du in den Wochen vor dem Gildentreff am {date} TWL (Today We Learned) oder Security-News Posts geschrieben?",
    presentationsLabel:
      "Hast du während des Gildentreffs am {date} ein Projekt oder ein Konzept vorgestellt?",
    noMeetingError: "Kein passendes Gildentreffen gefunden. Bitte kontaktiere deine Administratorin oder deinen Administrator.",
    previousMeetingButton: "Vorheriger Gildentreff",
    nextMeetingButton: "Nächster Gildentreff",
    meetingDateButton: "Gildentreff-Datum auswählen",
    loading: "Lädt...",
    lastModified: "Zuletzt geändert",
    never: "Nie",
    cancelButton: "Zurücksetzen",
    saveButton: "Speichern",
    saveSuccess: "Erfolgreich gespeichert.",
    saveError: "Speichern fehlgeschlagen. Bitte versuche es erneut.",
  },
  admin: {
    pointDistributionPageTitle: "Punkteverteilung",
    guildMeetingsPageTitle: "Gildentreffen",
  },
} as const;

export default de;
