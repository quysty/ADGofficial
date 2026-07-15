window.BcompMajorCatalog = {
  schemaVersion: 1,
  academicYear: 2026,
  component: "BCOMP",
  totalUnits: 48,
  verifiedAt: "2026-07-13",
  courses: {
    ARTH2181: { title: "Digital Approaches to Art History and Curatorship", units: 6 },
    ASIA3032: {
      title: "Technology and Society in Asia",
      displayTitle: "Digital Asia: Technology and Society",
      units: 6
    },
    COMP1710: { title: "Web Development and Design", units: 6 },
    COMP1720: { title: "Art and Interaction Computing", units: 6 },
    COMP2120: { title: "Software Engineering", units: 6 },
    COMP2310: { title: "Systems, Networks, and Concurrency", units: 6 },
    COMP2620: { title: "Logic", units: 6 },
    COMP2700: { title: "Cyber Security Foundations", units: 6 },
    COMP3300: { title: "Operating Systems Implementation", units: 6 },
    COMP3310: { title: "Computer Networks", units: 6 },
    COMP3320: { title: "High Performance Scientific Computation", units: 6 },
    COMP3425: { title: "Data Mining", units: 6 },
    COMP3430: { title: "Data Wrangling", units: 6 },
    COMP3500: {
      title: "Software Engineering Project",
      units: 12,
      unitsLabel: "6+6 units"
    },
    COMP3540: { title: "Game Development", units: 6 },
    COMP3600: { title: "Algorithms", units: 6 },
    COMP3610: { title: "Principles of Programming Languages", units: 6 },
    COMP3620: { title: "Artificial Intelligence", units: 6 },
    COMP3670: { title: "Introduction to Machine Learning", units: 6 },
    COMP3704: { title: "Network Security", units: 6 },
    COMP3900: { title: "Human-Computer Interaction", units: 6 },
    COMP4011: {
      title: "Advanced Topics in Formal Methods and Programming Languages",
      units: 6
    },
    COMP4045: { title: "Advanced Topics in Computer Systems", units: 6 },
    COMP4130: { title: "Managing Software Quality and Process", units: 6 },
    COMP4300: { title: "Parallel Systems", units: 6 },
    COMP4350: { title: "Sound and Music Computing", units: 6 },
    COMP4528: { title: "Computer Vision", units: 6 },
    COMP4610: { title: "Computer Graphics", units: 6 },
    COMP4620: { title: "Advanced Topics in Artificial Intelligence", units: 6 },
    COMP4650: { title: "Document Analysis", units: 6 },
    COMP4670: { title: "Statistical Machine Learning", units: 6 },
    COMP4680: { title: "Advanced Topics in Machine Learning", units: 6 },
    COMP4691: { title: "Optimisation", units: 6 },
    COMP4703: { title: "Vulnerability Research and Exploit Mitigation", units: 6 },
    COMP4712: { title: "Compiler Construction", units: 6 },
    COMP4880: { title: "Computational Methods for Network Science", units: 6 },
    CRIM2010: { title: "Cybercrime: an introduction", units: 6 },
    DESN2004: {
      title: "Autonomous Agents: Natural and Algorithmic Systems in Art and Design",
      units: 6
    },
    DESN2010: {
      title: "Making Creative and Critical Technologies: Physical Computing for Design and Art",
      displayTitle: "Physical Computing for Design and Art",
      units: 6
    },
    ENGN1211: { title: "Engineering Design 1: Discovering Engineering", units: 6 },
    ENGN1218: { title: "Introduction to Electronics", units: 6 },
    ENGN2218: { title: "Electronic Systems and Design", units: 6 },
    ENGN2300: { title: "Engineering Design 2: Systems Approaches for Design", units: 6 },
    ENGN4213: { title: "Digital Systems and Microprocessors", units: 6 },
    INFS1001: { title: "Business Information Systems", units: 6 },
    INFS2024: { title: "Information Systems Analysis", units: 6 },
    INFS3002: { title: "Enterprise Systems in Business", units: 6 },
    INFS3024: { title: "Information Systems Management", units: 6 },
    INFS3059: { title: "Information Systems Capstone Project", units: 6 },
    MATH2307: { title: "Bioinformatics and Biological Modelling", units: 6 },
    MATH3301: { title: "Number Theory and Cryptography", units: 6 },
    MGMT2009: { title: "Design Thinking: Human-Centred Innovation", units: 6 },
    MUSI1110: { title: "Introduction to Music Technology", units: 6 },
    MUSI3309: {
      title: "Digital Music: Platforms, Content and AI",
      displayTitle: "Music and Digital Media",
      units: 6
    },
    SCOM3029: { title: "Science Communication and Planetary Crises", units: 6 },
    SOCR3001: { title: "Data for Decision Making", units: 6 },
    SOCY2038: { title: "Introduction to Quantitative Research Methods", units: 6 },
    SOCY2166: { title: "Social Science of the Internet", units: 6 },
    STAT1003: { title: "Statistical Techniques", units: 6 }
  },
  majors: [
    {
      code: "COMS-MAJ",
      title: "Computer Systems",
      sourceUrl: "https://programsandcourses.anu.edu.au/2026/major/COMS-MAJ",
      constraints: { maximum1000LevelUnits: 18, minimum3000Or4000LevelUnits: 18 },
      groups: [
        {
          id: "COMS_COMPULSORY",
          label: "Compulsory",
          selectionMode: "all",
          units: 24,
          courseCodes: ["COMP2310", "COMP3300", "COMP3310", "ENGN4213"]
        },
        {
          id: "COMS_MINIMUM",
          label: "Choose at least",
          selectionMode: "minimum_units",
          units: 6,
          courseCodes: ["COMP3320", "COMP3610"]
        },
        {
          id: "COMS_MAXIMUM",
          label: "Choose up to",
          selectionMode: "maximum_units",
          units: 18,
          courseCodes: ["COMP4045", "COMP4300", "COMP4712", "ENGN1218", "ENGN2218"]
        }
      ]
    },
    {
      code: "CSEC-MAJ",
      title: "Cyber Security",
      sourceUrl: "https://programsandcourses.anu.edu.au/2026/major/CSEC-MAJ",
      constraints: { minimum3000Or4000LevelUnits: 18 },
      groups: [
        {
          id: "CSEC_COMPULSORY",
          label: "Compulsory",
          selectionMode: "all",
          units: 36,
          courseCodes: ["COMP2120", "COMP2310", "COMP2700", "COMP3300", "COMP3310", "COMP3704"]
        },
        {
          id: "CSEC_MINIMUM",
          label: "Choose at least",
          selectionMode: "minimum_units",
          units: 6,
          courseCodes: ["COMP4130", "COMP4703"]
        },
        {
          id: "CSEC_MAXIMUM",
          label: "Choose up to",
          selectionMode: "maximum_units",
          units: 6,
          courseCodes: ["COMP4011", "COMP4045", "COMP4712", "CRIM2010", "MATH3301"]
        }
      ]
    },
    {
      code: "DTSC-MAJ",
      title: "Data Science",
      sourceUrl: "https://programsandcourses.anu.edu.au/major/DTSC-MAJ",
      constraints: { maximum1000LevelUnits: 18, minimum3000Or4000LevelUnits: 18 },
      groups: [
        {
          id: "DTSC_COMPULSORY",
          label: "Compulsory",
          selectionMode: "all",
          units: 12,
          courseCodes: ["COMP3425", "COMP3430"]
        },
        {
          id: "DTSC_ELECTIVES",
          label: "Choose",
          selectionMode: "exact_units",
          units: 36,
          courseCodes: ["COMP2120", "COMP2700", "COMP3670", "COMP4650", "COMP4880", "MATH2307", "SOCR3001", "STAT1003"]
        }
      ]
    },
    {
      code: "HCCC-MAJ",
      title: "Human-Centred and Creative Computing",
      sourceUrl: "https://programsandcourses.anu.edu.au/2026/major/HCCC-MAJ",
      constraints: { maximum1000LevelUnits: 18, minimum3000Or4000LevelUnits: 18 },
      groups: [
        {
          id: "HCCC_COMPULSORY",
          label: "Compulsory",
          selectionMode: "all",
          units: 12,
          courseCodes: ["COMP1720", "COMP3900"]
        },
        {
          id: "HCCC_ADVANCED",
          label: "Advanced HCCC · choose at least",
          selectionMode: "minimum_units",
          units: 12,
          courseCodes: ["COMP3540", "COMP4350", "COMP4610", "COMP4528"]
        },
        {
          id: "HCCC_1000_LEVEL",
          label: "1000-level list · choose up to",
          selectionMode: "maximum_units",
          units: 12,
          courseCodes: ["COMP1710", "MUSI1110"]
        },
        {
          id: "HCCC_INTERDISCIPLINARY",
          label: "Interdisciplinary list · choose up to",
          selectionMode: "maximum_units",
          units: 24,
          courseCodes: ["ARTH2181", "COMP2120", "COMP3670", "DESN2004", "DESN2010", "MGMT2009", "MUSI3309", "SOCR3001", "SOCY2038", "SOCY2166"]
        }
      ]
    },
    {
      code: "INFS-MAJ",
      title: "Information Systems",
      sourceUrl: "https://programsandcourses.anu.edu.au/2026/major/INFS-MAJ",
      constraints: { maximum1000LevelUnits: 18, minimum3000Or4000LevelUnits: 18 },
      groups: [
        {
          id: "INFS_COMPULSORY",
          label: "Compulsory",
          selectionMode: "all",
          units: 30,
          courseCodes: ["COMP2120", "INFS1001", "INFS2024", "INFS3024", "INFS3059"]
        },
        {
          id: "INFS_ELECTIVES",
          label: "Choose",
          selectionMode: "exact_units",
          units: 18,
          courseCodes: ["COMP3425", "COMP3430", "COMP3900", "COMP4650", "INFS3002"]
        }
      ]
    },
    {
      code: "INSY-MAJ",
      title: "Intelligent Systems",
      sourceUrl: "https://programsandcourses.anu.edu.au/2026/major/INSY-MAJ",
      constraints: { maximum1000LevelUnits: 18, minimum3000Or4000LevelUnits: 18 },
      groups: [
        {
          id: "INSY_COMPULSORY",
          label: "Compulsory",
          selectionMode: "all",
          units: 18,
          courseCodes: ["COMP2620", "COMP3620", "COMP3670"]
        },
        {
          id: "INSY_MINIMUM",
          label: "Intelligent Systems · choose at least",
          selectionMode: "minimum_units",
          units: 12,
          courseCodes: ["COMP3600", "COMP4620", "COMP4670", "COMP4680", "COMP4691"]
        },
        {
          id: "INSY_MAXIMUM",
          label: "Additional list · choose up to",
          selectionMode: "maximum_units",
          units: 18,
          courseCodes: ["COMP4528", "COMP4610", "COMP4650"]
        }
      ]
    },
    {
      code: "SOFT-MAJ",
      title: "Software Development",
      sourceUrl: "https://programsandcourses.anu.edu.au/2026/major/SOFT-MAJ",
      constraints: { maximum1000LevelUnits: 18, minimum3000Or4000LevelUnits: 18 },
      groups: [
        {
          id: "SOFT_COMPULSORY",
          label: "Compulsory",
          selectionMode: "all",
          units: 24,
          courseCodes: ["COMP2120", "COMP3500", "COMP4130"]
        },
        {
          id: "SOFT_MINIMUM",
          label: "Choose at least",
          selectionMode: "minimum_units",
          units: 12,
          courseCodes: ["COMP3600", "COMP3610", "COMP3900", "INFS3024", "INFS3059"]
        },
        {
          id: "SOFT_MAXIMUM",
          label: "Choose up to",
          selectionMode: "maximum_units",
          units: 12,
          courseCodes: ["ASIA3032", "COMP2700", "ENGN1211", "ENGN2300", "INFS3002", "MGMT2009", "SCOM3029"]
        }
      ]
    }
  ]
};
