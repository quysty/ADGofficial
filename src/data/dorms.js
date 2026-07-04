/* =========================================================
   CENTRAL DORM DATA
   当前用途：
   1) 给首页 ranked dorm cards 使用
   2) 给首页 compare table 使用
   3) 给 Information 页面使用
   4) 给首页 Explore / Information 跳转使用

   注意：
   - dorm.image 当前使用 assets/images/ 路径
   - isHomeCandidate 控制是否进入首页推荐
   - isInformationVisible 控制是否进入 Information 页面
   - isMapLinked 标记是否已经和 Explore 地图关联
   ========================================================= */

(function initDormData() {
  window.DORM_DATA = [
    {
      id: "lena",
      buildingId: "dorm_lena",
      mapFocus: "dorm_lena",
      isHomeCandidate: true,
      isInformationVisible: true,
      isMapLinked: true,
      name: "Lena Karmel Lodge",
      shortName: "Lena",
      tag: "QUIET / PRIVATE",
      image: "assets/images/IMG_6336.jpeg",
      pricePerWeek: null,
      type: "Apartment-style residence",
      location: "City-side / campus edge",
      distance: null,
      tags: ["quiet", "private", "independent"],
      bestFor:
        "A strong option when the user prioritises privacy, personal space, and structured independent living.",
      locationFeel:
        "Modern and practical, with a stronger sense of private routine than traditional hall life.",
      tradeOff:
        "Can feel more independent and less socially automatic than some more communal residences.",
      summary:
        "A strong option when the user prioritises privacy, personal space, and structured independent living.",
      description:
        "A residence option currently represented as a quiet and private choice in the prototype recommendation logic.",
      pros: [
        "Supports a more independent daily rhythm",
        "Works well for students who value personal space"
      ],
      cons: [
        "May feel less socially automatic than more communal residences"
      ],
      ranking: {
        default: 1,
        quiet: 1,
        city: 2,
        value: 3
      },
      score: {
        default: 90,
        quiet: 95,
        city: 80,
        value: 70
      }
    },
    {
      id: "warrumbul",
      buildingId: "dorm_warrumbul",
      mapFocus: "dorm_warrumbul",
      isHomeCandidate: true,
      isInformationVisible: true,
      isMapLinked: true,
      name: "Warrumbul Lodge",
      shortName: "Warrumbul",
      tag: "CITY / ACCESS",
      image: "assets/images/IMG_6336.jpeg",
      pricePerWeek: null,
      type: "Self-catered residence",
      location: "Campus / city access",
      distance: null,
      tags: ["city", "access", "practical"],
      bestFor:
        "Useful when the user wants practical location advantages and everyday movement convenience.",
      locationFeel:
        "Convenient, flexible, and easier for students who care about getting around efficiently.",
      tradeOff:
        "Its strength is practicality rather than a highly distinctive hall-style atmosphere.",
      summary:
        "Useful when the user wants practical location advantages and everyday movement convenience.",
      description:
        "A residence option currently represented as a practical access-focused choice in the prototype recommendation logic.",
      pros: [
        "Good for everyday movement convenience",
        "Useful for students who care about practical access"
      ],
      cons: [
        "Its current prototype strength is practical rather than highly distinctive"
      ],
      ranking: {
        default: 2,
        quiet: 3,
        city: 1,
        value: 2
      },
      score: {
        default: 82,
        quiet: 70,
        city: 95,
        value: 80
      }
    },
    {
      id: "wright",
      buildingId: "dorm_wright",
      mapFocus: "dorm_wright",
      isHomeCandidate: true,
      isInformationVisible: true,
      isMapLinked: true,
      name: "Wright Hall",
      shortName: "Wright",
      tag: "RESIDENTIAL / EXPERIENCE",
      image: "assets/images/IMG_6944.jpeg",
      pricePerWeek: null,
      type: "Residential hall",
      location: "Residential campus setting",
      distance: null,
      tags: ["residential", "social", "experience"],
      bestFor:
        "Relevant when the user is comparing social atmosphere, view quality, shared spaces, and the meaning of residential life.",
      locationFeel:
        "More overtly residential, more social, and easier to read as a classic hall environment.",
      tradeOff:
        "It may suit users less well if they strongly prefer private, apartment-like living.",
      summary:
        "Relevant when the user is comparing social atmosphere, view quality, shared spaces, and the meaning of residential life.",
      description:
        "A residence option currently represented as a more residential and experience-oriented choice in the prototype recommendation logic.",
      pros: [
        "Stronger residential atmosphere",
        "Better suited to users comparing hall-style experience"
      ],
      cons: [
        "May be less suitable for users who strongly prefer private apartment-like living"
      ],
      ranking: {
        default: 3,
        quiet: 2,
        city: 3,
        value: 1
      },
      score: {
        default: 78,
        quiet: 75,
        city: 65,
        value: 88
      }
    },
    {
      id: "kinloch",
      buildingId: "dorm_kinloch",
      mapFocus: "dorm_kinloch",
      isHomeCandidate: true,
      isInformationVisible: true,
      isMapLinked: true,
      name: "Kinloch Lodge",
      shortName: "Kinloch",
      tag: "CITY / SELF-CONTAINED",
      image: "assets/images/IMG_6845.jpeg",
      pricePerWeek: null,
      type: "Apartment-style residence",
      location: "Childers Street / city edge",
      distance: null,
      tags: ["city", "self-contained", "practical"],
      bestFor:
        "A practical option when the user wants self-contained living close to both campus routines and the city edge.",
      locationFeel:
        "Urban, convenient, and more independent-feeling than a traditional residential hall.",
      tradeOff:
        "May feel more functional and apartment-like, with less automatic hall-style community energy.",
      summary:
        "A practical option when the user wants self-contained living close to both campus routines and the city edge.",
      description:
        "A lodge-style residence currently represented as a city-edge, self-contained option in the prototype recommendation logic.",
      pros: [
        "Convenient Childers Street location",
        "Supports a more independent daily routine"
      ],
      cons: [
        "May feel less socially automatic than a traditional hall"
      ],
      ranking: {
        default: 4,
        quiet: 4,
        city: 4,
        value: 4
      },
      score: {
        default: 74,
        quiet: 72,
        city: 78,
        value: 76
      }
    },
    {
      id: "davey",
      buildingId: "dorm_davey",
      mapFocus: "dorm_davey",
      isHomeCandidate: true,
      isInformationVisible: true,
      isMapLinked: true,
      name: "Davey Lodge",
      shortName: "Davey",
      tag: "APARTMENT / SOCIAL",
      image: "assets/images/IMG_7082.jpeg",
      pricePerWeek: null,
      type: "Self-catered apartment residence",
      location: "Childers Street / city access",
      distance: null,
      tags: ["apartment", "city", "shared"],
      bestFor:
        "Useful when the user wants apartment-style independence while still having shared spaces and campus-city convenience.",
      locationFeel:
        "Central, practical, and designed around self-catered apartments with common spaces for social interaction.",
      tradeOff:
        "Its appeal is convenience and self-contained living rather than a classic catered college atmosphere.",
      summary:
        "Useful when the user wants apartment-style independence while still having shared spaces and campus-city convenience.",
      description:
        "A self-catered lodge option currently represented as an apartment-style residence with practical access and shared common spaces.",
      pros: [
        "Apartment-style rooms with self-catered routines",
        "Common spaces support casual social interaction"
      ],
      cons: [
        "May not suit users looking for a strongly traditional hall atmosphere"
      ],
      ranking: {
        default: 5,
        quiet: 5,
        city: 5,
        value: 5
      },
      score: {
        default: 72,
        quiet: 68,
        city: 76,
        value: 74
      }
    },
    {
      id: "toad",
      buildingId: "dorm_toad",
      mapFocus: "dorm_toad",
      isHomeCandidate: false,
      isInformationVisible: true,
      isMapLinked: true,
      name: "Toad Hall",
      shortName: "Toad",
      tag: "PLACEHOLDER / RESIDENCE",
      image: "assets/images/IMG_6336.jpeg",
      pricePerWeek: null,
      type: "Residential hall",
      location: "ANU campus",
      distance: null,
      tags: ["placeholder", "residence", "map-linked"],
      bestFor:
        "Placeholder profile for future dorm comparison, map navigation, and residence detail content.",
      locationFeel:
        "Location and living feel are pending detailed content review.",
      tradeOff:
        "This profile is currently a functional placeholder and should be refined later.",
      summary:
        "Placeholder residence profile for Toad Hall.",
      description:
        "Toad Hall is now linked to the Explore map as a usable dorm label. Detailed residence content is pending.",
      pros: [
        "Map label and dorm detail flow are enabled",
        "Ready for later residence-specific content"
      ],
      cons: [
        "Detailed room, rent, and lifestyle notes are not written yet"
      ]
    },
    {
      id: "fenner",
      buildingId: "dorm_fenner",
      mapFocus: "dorm_fenner",
      isHomeCandidate: false,
      isInformationVisible: true,
      isMapLinked: true,
      name: "Fenner Hall",
      shortName: "Fenner",
      tag: "PLACEHOLDER / RESIDENCE",
      image: "assets/images/IMG_6845.jpeg",
      pricePerWeek: null,
      type: "Residential hall",
      location: "ANU campus",
      distance: null,
      tags: ["placeholder", "residence", "map-linked"],
      bestFor:
        "Placeholder profile for future dorm comparison, map navigation, and residence detail content.",
      locationFeel:
        "Location and living feel are pending detailed content review.",
      tradeOff:
        "This profile is currently a functional placeholder and should be refined later.",
      summary:
        "Placeholder residence profile for Fenner Hall.",
      description:
        "Fenner Hall is now linked to the Explore map as a usable dorm label. Detailed residence content is pending.",
      pros: [
        "Map label and dorm detail flow are enabled",
        "Ready for later residence-specific content"
      ],
      cons: [
        "Detailed room, rent, and lifestyle notes are not written yet"
      ]
    },
    {
      id: "bruce",
      buildingId: "dorm_bruce",
      mapFocus: "dorm_bruce",
      isHomeCandidate: false,
      isInformationVisible: true,
      isMapLinked: true,
      name: "Bruce Hall",
      shortName: "Bruce",
      tag: "PLACEHOLDER / RESIDENCE",
      image: "assets/images/IMG_6944.jpeg",
      pricePerWeek: null,
      type: "Residential hall",
      location: "ANU campus",
      distance: null,
      tags: ["placeholder", "residence", "map-linked"],
      bestFor:
        "Placeholder profile for future dorm comparison, map navigation, and residence detail content.",
      locationFeel:
        "Location and living feel are pending detailed content review.",
      tradeOff:
        "This profile is currently a functional placeholder and should be refined later.",
      summary:
        "Placeholder residence profile for Bruce Hall.",
      description:
        "Bruce Hall is now linked to the Explore map as a usable dorm label. Detailed residence content is pending.",
      pros: [
        "Map label and dorm detail flow are enabled",
        "Ready for later residence-specific content"
      ],
      cons: [
        "Detailed room, rent, and lifestyle notes are not written yet"
      ]
    },
    {
      id: "ursula-laurus",
      buildingId: "dorm_ursula_laurus",
      mapFocus: "dorm_ursula_laurus",
      isHomeCandidate: false,
      isInformationVisible: true,
      isMapLinked: true,
      name: "Ursula Hall Laurus Wing",
      shortName: "Ursula",
      tag: "PLACEHOLDER / RESIDENCE",
      image: "assets/images/IMG_7082.jpeg",
      pricePerWeek: null,
      type: "Residential hall",
      location: "ANU campus",
      distance: null,
      tags: ["placeholder", "residence", "map-linked"],
      bestFor:
        "Placeholder profile for future dorm comparison, map navigation, and residence detail content.",
      locationFeel:
        "Location and living feel are pending detailed content review.",
      tradeOff:
        "This profile is currently a functional placeholder and should be refined later.",
      summary:
        "Placeholder residence profile for Ursula Hall Laurus Wing.",
      description:
        "Ursula Hall Laurus Wing is now linked to the Explore map as a usable dorm label. Detailed residence content is pending.",
      pros: [
        "Map label and dorm detail flow are enabled",
        "Ready for later residence-specific content"
      ],
      cons: [
        "Detailed room, rent, and lifestyle notes are not written yet"
      ]
    },
    {
      id: "burton-garran",
      buildingId: "dorm_burton_garran",
      mapFocus: "dorm_burton_garran",
      isHomeCandidate: false,
      isInformationVisible: true,
      isMapLinked: true,
      name: "Burton & Garran Hall",
      shortName: "B&G",
      tag: "PLACEHOLDER / RESIDENCE",
      image: "assets/images/IMG_6288.jpeg",
      pricePerWeek: null,
      type: "Residential hall",
      location: "ANU campus",
      distance: null,
      tags: ["placeholder", "residence", "map-linked"],
      bestFor:
        "Placeholder profile for future dorm comparison, map navigation, and residence detail content.",
      locationFeel:
        "Location and living feel are pending detailed content review.",
      tradeOff:
        "This profile is currently a functional placeholder and should be refined later.",
      summary:
        "Placeholder residence profile for Burton & Garran Hall.",
      description:
        "Burton & Garran Hall is now linked to the Explore map as a usable dorm label. Detailed residence content is pending.",
      pros: [
        "Map label and dorm detail flow are enabled",
        "Ready for later residence-specific content"
      ],
      cons: [
        "Detailed room, rent, and lifestyle notes are not written yet"
      ]
    }
  ];
})();
