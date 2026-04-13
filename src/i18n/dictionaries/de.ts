const de = {
  metadata: {
    title: "Guild Engine",
    description: "Starte dein Guild-Engine-Projekt mit Next.js.",
  },
  home: {
    heading: "Zum Start bearbeite die Datei page.tsx.",
    introBeforeTemplate:
      "Suchst du nach einem Startpunkt oder weiteren Anleitungen? Schau bei",
    templateLinkLabel: "Vorlagen",
    introMiddle: "oder im",
    learningLinkLabel: "Lernbereich",
    introAfter: "vorbei.",
    deployButton: "Jetzt deployen",
    docsButton: "Dokumentation",
    toggleToLight: "Heller Modus",
    toggleToDark: "Dunkler Modus",
  },
  topbar: {
    brand: "Guild Engine",
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
      "Hast du am letzten Gildentreff teilgenommen (zählt nur, wenn du vor der Protokollverlosung da warst)?",
    attendanceNo: "Nein",
    attendanceVirtually: "Ja, virtuell",
    attendanceOnSite: "Ja, vor Ort",
    protocolLabel: "Hast du das Protokoll für den letzten Gildentreff geschrieben?",
    protocolNo: "Nein",
    protocolForced: "Ja, gezwungen",
    protocolVoluntary: "Ja, freiwillig",
    moderationLabel: "Hast du den letzten Gildentreff moderiert?",
    yes: "Ja",
    no: "Nein",
    participationLabel:
      "Hast du zwischen den letzten zwei Gildentreffs aktiv in mindestens einer Arbeitsgruppe mitgemacht?",
    twlPostsLabel:
      "Hast du zwischen den letzten zwei Gildentreffs TWL (Today We Learned) oder Security-News Posts geschrieben?",
    presentationsLabel:
      "Hast du während des letzten Gildentreffs ein Projekt oder ein Konzept vorgestellt?",
    saveButton: "Speichern",
    savedAlert: "Gespeichert!",
  },
} as const;

export default de;

