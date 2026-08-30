/** Starter content shared by the browser app and the Node seed script. */

export const SEED = {
  users: [
    {
      id: 'nova',
      username: 'nova',
      displayName: 'Nova Reyes',
      bio: 'Speedrunner. Writes the story-mission guides nobody else wants to.',
      role: 'Contributor',
      joinedAt: '2025-11-02',
      location: 'Leeds, UK'
    },
    {
      id: 'mapmaker',
      username: 'mapmaker',
      displayName: 'Ari Kovac',
      bio: 'Cartographer for hire. Collectible routes and 100% checklists.',
      role: 'Moderator',
      joinedAt: '2025-09-14',
      location: 'Zagreb, HR'
    },
    {
      id: 'sable',
      username: 'sable',
      displayName: 'Sable',
      bio: 'Combat encounters, frame data and hard-mode strategies.',
      role: 'Contributor',
      joinedAt: '2026-01-20',
      location: 'Toronto, CA'
    },
    {
      id: 'pixelpush',
      username: 'pixelpush',
      displayName: 'Dana P.',
      bio: 'PC performance tuning and graphics settings comparisons.',
      role: 'Member',
      joinedAt: '2026-03-08',
      location: 'Austin, US'
    },
    {
      id: 'admin',
      username: 'admin',
      displayName: 'Companion for GTA6 Staff',
      bio: 'Official account. Announcements and rule changes.',
      role: 'Admin',
      joinedAt: '2025-08-01',
      location: 'Everywhere'
    }
  ],
  walkthroughs: [
    {
      id: 'gtao-event-drift-transform',
      title: 'GTA Online Event Week: Drift and Transform Races',
      game: 'GTA Online',
      category: 'Races',
      duration: 45,
      author: 'admin',
      likes: 0,
      approved: true,
      updatedAt: '2026-08-27',
      cover: '🏁',
      summary: 'Make the most of the 27 August to 2 September Drift and Transform event, including the three-race GTA$100,000 challenge.',
      tags: ['GTA Online', 'event week', 'races', 'weekly challenge'],
      steps: [
        'Complete three Drift Races to earn the GTA$100,000 weekly challenge reward. Winning is not required.',
        'Use the 6x GTA$ and RP window on selected Drift and Transform Races from 28 to 30 August.',
        'Use Random Transform Races for 3x GTA$ and RP, or Drift Races for 2x GTA$, RP, and LS Car Meet Rep.',
        'Complete a Drift Race in an Ubermacht Cypher to unlock the Glitch Camo Drift Livery; delivery can take up to 72 hours.',
        'Switch to Auto Shop Robbery Contracts when you want structured missions with 2x GTA$, RP, and LS Car Meet Rep.'
      ]
    },
    {
      id: 'gtao-drift-guide',
      title: 'Drift Guide: Tuning, Technique, and Race Tips',
      game: 'GTA Online',
      category: 'Cars',
      duration: 30,
      author: 'sable',
      likes: 0,
      approved: true,
      updatedAt: '2026-08-27',
      cover: '💨',
      summary: 'Learn controlled oversteer, avoid common mistakes, and prepare an eligible car for Drift Races.',
      tags: ['GTA Online', 'drifting', 'LS Car Meet', 'races'],
      steps: [
        'Enter a corner with enough speed, turn in, then tap the handbrake or use throttle to break rear-wheel traction.',
        'Counter-steer into the slide and make small throttle adjustments to hold the drift.',
        'Avoid entering too fast, holding the handbrake too long, or trying to drift every corner.',
        'Test Drift Tuning in a low-pressure session before racing competitively.',
        'The Annis Elegy Retro Custom, Invetero Coquette, and Vapid Dominator GTT are eligible for Drift Tuning in this event.',
        'Complete three Drift Races to finish the weekly challenge.'
      ]
    },
    {
      id: 'gtao-auto-shop-contracts',
      title: 'Auto Shop Robbery Contracts: Solo Setup Guide',
      game: 'GTA Online',
      category: 'Missions',
      duration: 60,
      author: 'nova',
      likes: 0,
      approved: true,
      updatedAt: '2026-08-27',
      cover: '🔧',
      summary: 'A practical route for running Auto Shop Robbery Contracts during the 2x reward event week.',
      tags: ['GTA Online', 'Auto Shop', 'money', 'solo'],
      steps: [
        'Buy an Auto Shop property and enter it to access the planning board.',
        'Choose an available Robbery Contract and complete its preparation missions.',
        'Stock up on armor and snacks before starting the finale.',
        'Use a fast armoured vehicle between objectives and take safe routes when playing solo.',
        'Finish the finale to collect the 2x GTA$, RP, and LS Car Meet Rep payout.',
        'Rotate into Drift or Random Transform Races when new contracts are on cooldown.'
      ]
    },
    {
      id: 'gtao-vehicle-spotlight',
      title: 'Vehicle Spotlight: Sultan Classic and Veto Classic',
      game: 'GTA Online',
      category: 'Cars',
      duration: 15,
      author: 'mapmaker',
      likes: 0,
      approved: true,
      updatedAt: '2026-08-27',
      cover: '🚘',
      summary: 'Track the weekly Podium Vehicle, Prize Ride requirement, and the 30 percent discount watchlist.',
      tags: ['GTA Online', 'vehicles', 'Lucky Wheel', 'Prize Ride'],
      steps: [
        'Visit The Diamond Casino and spin the Lucky Wheel once per real-world day for a chance at the Karin Sultan Classic.',
        'Place in the top five of the LS Car Meet Series for four days in a row to unlock the Dinka Veto Classic Prize Ride.',
        'Track each of the four top-five finishes and claim the Prize Ride after the requirement is complete.',
        'Check the weekly discounts before buying the Cheval Taipan, Vapid Flash GT, Invetero Coquette D5, Annis ZR350, or other watchlist vehicles.',
        'Remember that weekly vehicles and discounts rotate after the event ends.'
      ]
    },
    {
      id: 'gtao-weekend-racing-grind',
      title: 'Weekend Racing Grind: 6x GTA$ and RP Route',
      game: 'GTA Online',
      category: 'Money',
      duration: 50,
      author: 'pixelpush',
      likes: 0,
      approved: true,
      updatedAt: '2026-08-27',
      cover: '💰',
      summary: 'A flexible weekend route for the 28 to 30 August six-times reward window and the rest of Drift Week.',
      tags: ['GTA Online', 'money', 'races', 'grind'],
      steps: [
        'Start with a Drift Race and repeat until the three-race weekly challenge is complete.',
        'Claim the GTA$100,000 challenge reward after participating in three Drift Races.',
        'Move into selected Drift and Transform Races during the 6x reward window.',
        'Rotate into Random Transform Races for 3x GTA$ and RP when you want a change of pace.',
        'Use Auto Shop Robbery Contracts for structured 2x-reward missions between race queues.',
        'Track earnings, race wins, and LS Car Meet Reputation so you can compare your route next week.'
      ]
    },
    {
      id: 'wt-1',
      title: 'Prologue: Getting Out of Town',
      game: 'GTA 6',
      category: 'Missions',
      duration: 25,
      author: 'nova',
      likes: 12,
      approved: true,
      updatedAt: '2026-08-12',
      summary: 'Complete the opening heist and escape the county line without losing wanted stars.',
      tags: ['story', 'beginner'],
      steps: [
        'Follow the on-screen prompts to reach the getaway vehicle.',
        'Stick to back roads to avoid the first police checkpoint.',
        'Swap vehicles at the barn to drop your wanted level.',
        'Drive to the safehouse and stash the loot.'
      ]
    },
    {
      id: 'wt-2',
      title: 'All Collectible Locations',
      game: 'GTA 6',
      category: 'Collectibles',
      duration: 180,
      author: 'mapmaker',
      likes: 26,
      approved: true,
      updatedAt: '2026-08-20',
      summary: 'Region-by-region route for every hidden collectible with the fastest travel order.',
      tags: ['collectibles', '100%'],
      steps: [
        'Unlock fast travel by finishing the second story chapter.',
        'Sweep the coastal region from south to north.',
        'Clear the inland swamp at night for easier spotting.',
        'Finish with the city rooftops using a helicopter.'
      ]
    },
    {
      id: 'wt-3',
      title: 'Hard Mode Boss Strategy',
      game: 'GTA 6',
      category: 'Missions',
      duration: 45,
      author: 'sable',
      likes: 19,
      approved: true,
      updatedAt: '2026-08-25',
      summary: 'Loadout, cover positions and timing windows for the final confrontation.',
      tags: ['combat', 'endgame'],
      steps: [
        'Bring armor-piercing rounds and at least three medkits.',
        'Use the left-side cover to bait the first attack pattern.',
        'Break line of sight when the shield phase begins.',
        'Focus damage during the reload window after each volley.'
      ]
    },
    {
      id: 'wt-4',
      title: 'Fast Money in the First 5 Hours',
      game: 'GTA 6',
      category: 'Money',
      duration: 60,
      author: 'nova',
      likes: 9,
      approved: true,
      updatedAt: '2026-08-18',
      summary: 'Repeatable early-game income loop that requires no upfront investment.',
      tags: ['economy', 'beginner'],
      steps: [
        'Complete the courier side jobs near the docks.',
        'Sell recovered vehicles at the west chop shop.',
        'Reinvest in a garage slot to double payout capacity.'
      ]
    }
  ],
  threads: [
    {
      id: 'gtao-th-drift-build',
      title: 'Show your drift build',
      category: 'GTA Online',
      author: 'admin',
      likes: 0,
      createdAt: '2026-08-27',
      body: 'Post your vehicle, upgrades, controller settings, and best tips for holding a long drift during Drift Week.',
      replies: []
    },
    {
      id: 'gtao-th-weekly-challenge',
      title: 'Best way to finish the weekly challenge?',
      category: 'GTA Online',
      author: 'admin',
      likes: 0,
      createdAt: '2026-08-27',
      body: 'Which Drift Races feel fastest and easiest for completing three races? Winning is not required, so share a reliable route for newer players.',
      replies: []
    },
    {
      id: 'gtao-th-transform-strategy',
      title: 'Transform Race strategy',
      category: 'GTA Online',
      author: 'admin',
      likes: 0,
      createdAt: '2026-08-27',
      body: 'Do you prioritise clean checkpoint lines, aggressive overtakes, or risky shortcuts when the vehicle class changes?',
      replies: []
    },
    {
      id: 'gtao-th-contract-crew',
      title: 'Auto Shop contract crew finder',
      category: 'GTA Online',
      author: 'admin',
      likes: 0,
      createdAt: '2026-08-27',
      body: 'Find players for Auto Shop preparation missions and contract finales. Include your platform, timezone, and preferred playstyle.',
      replies: []
    },
    {
      id: 'gtao-th-vehicle-deals',
      title: 'Vehicle deal verdicts',
      category: 'GTA Online',
      author: 'admin',
      likes: 0,
      createdAt: '2026-08-27',
      body: 'Which discounted vehicle is worth buying this week, and which should players skip? Explain the value for new and returning players.',
      replies: []
    },
    {
      id: 'th-1',
      title: 'Best settings for 60fps on mid-range hardware?',
      category: 'Tech',
      author: 'pixelpush',
      likes: 8,
      createdAt: '2026-08-24',
      body: 'Shadows and volumetric fog seem to be the biggest cost. What are you all running?',
      replies: [
        { id: 'r-1', author: 'sable', createdAt: '2026-08-24', body: 'Drop volumetrics to medium first, it is worth ~12fps.' },
        { id: 'r-2', author: 'nova', createdAt: '2026-08-25', body: 'Also cap the framerate, the frametimes get much smoother.' }
      ]
    },
    {
      id: 'th-2',
      title: 'Missable trophies list — help me verify',
      category: 'Guides',
      author: 'mapmaker',
      likes: 14,
      createdAt: '2026-08-21',
      body: 'I have found four so far. Adding them to the collectibles walkthrough once confirmed.',
      replies: [
        { id: 'r-3', author: 'pixelpush', createdAt: '2026-08-22', body: 'The chapter 3 photo one is definitely missable.' }
      ]
    },
    {
      id: 'th-3',
      title: 'Introduce yourself here',
      category: 'General',
      author: 'admin',
      likes: 3,
      createdAt: '2026-08-01',
      body: 'New here? Say hello and tell us what you are playing.',
      replies: []
    }
  ],
  pendingWalkthroughs: [
    {
      id: 'pwt-seed-1',
      title: 'Secret Vehicle Spawns in Vice Port',
      game: 'GTA 6',
      category: 'Cars',
      duration: 15,
      author: 'pixelpush',
      authorUid: 'pixelpush',
      likes: 0,
      updatedAt: '2026-08-20',
      createdAt: '2026-08-20',
      summary: 'Detailed coordinate points and times for rare muscle cars in the industrial shipping docks.',
      tags: ['vehicles', 'secrets', 'vice-port'],
      steps: [
        { title: 'Head to the East Cranes', content: 'Arrive at the shipping yard between 02:00 and 04:00 in-game time.' },
        { title: 'Check Warehouse 4B', content: 'The shutter door has a small opening on the south side where the vehicle spawns.' }
      ]
    }
  ],
  news: [
    {
      id: "gta6-release-date",
      title: "Official Release Date Announced",
      category: "Official",
      content: "GTA 6 will officially release on Thursday, November 19, 2026, for the PlayStation 5 and Xbox Series X/S.",
      sourceLink: "https://rockstargames.com/newswire",
      isApproved: true,
      author: "admin",
      authorUid: "admin",
      dateAdded: "2026-08-30T10:00:00Z"
    },
    {
      id: "gta6-performance-scale",
      title: "Performance & Scale Details",
      category: "Official",
      content: "The campaign takes up to 80 hours to beat, and the game is capped at 30fps on consoles. The budget reportedly surpassed 1 to 2 billion dollars.",
      sourceLink: "https://rockstargames.com/newswire",
      isApproved: true,
      author: "admin",
      authorUid: "admin",
      dateAdded: "2026-08-30T10:05:00Z"
    },
    {
      id: "gta6-protagonists-romance",
      title: "Protagonists & Romance Options",
      category: "Official",
      content: "Features dual protagonists, Lucia Caminos and Jason Duval. They have a modern \"Bonnie and Clyde\" dynamic, but romance is optional and must be actively nurtured.",
      sourceLink: "https://rockstargames.com/newswire",
      isApproved: true,
      author: "admin",
      authorUid: "admin",
      dateAdded: "2026-08-30T10:10:00Z"
    },
    {
      id: "gta6-rpg-mechanics",
      title: "Dynamic RPG Mechanics",
      category: "Official",
      content: "Players can gain or lose weight, and sleep deprivation will visibly show on their faces.",
      sourceLink: "https://rockstargames.com/newswire",
      isApproved: true,
      author: "admin",
      authorUid: "admin",
      dateAdded: "2026-08-30T10:15:00Z"
    },
    {
      id: "gta6-august-leaks",
      title: "August 2026 Gameplay Leaks",
      category: "Leaks",
      content: "A group known as \"CyberLeek\" released footage showing a basketball minigame with a \"Focus\" mechanic, a taser weapon, and key-cloning for vehicles.",
      sourceLink: "",
      isApproved: true,
      author: "admin",
      authorUid: "admin",
      dateAdded: "2026-08-30T10:20:00Z"
    }
  ]
};

export const CATEGORIES = ['General', 'Guides', 'Tech', 'News', 'GTA Online', 'Off-topic'];

export const TROPHIES = [
  { id: 't-01', title: 'Welcome to Vice City', description: 'Complete the opening mission.', category: 'Story', tier: 'Bronze' },
  { id: 't-02', title: 'No Loose Ends', description: 'Complete the main story.', category: 'Story', tier: 'Gold' },
  { id: 't-03', title: 'Smooth Operator', description: 'Complete a mission without raising your wanted level.', category: 'Story', tier: 'Bronze' },
  { id: 't-04', title: 'Sunset Boulevard', description: 'Visit every major district in the city.', category: 'Exploration', tier: 'Silver' },
  { id: 't-05', title: 'Off the Grid', description: 'Discover 25 hidden locations.', category: 'Exploration', tier: 'Silver' },
  { id: 't-06', title: 'Four Wheels', description: 'Collect 10 unique vehicles.', category: 'Exploration', tier: 'Bronze' },
  { id: 't-07', title: 'Big Score', description: 'Earn $1,000,000 from side activities.', category: 'Side Activities', tier: 'Gold' },
  { id: 't-08', title: 'Night Shift', description: 'Finish a full night of taxi work.', category: 'Side Activities', tier: 'Bronze' },
  { id: 't-09', title: 'Local Legend', description: 'Reach maximum reputation with one crew.', category: 'Side Activities', tier: 'Silver' },
  { id: 't-10', title: 'Sharp Eye', description: 'Find 10 hidden photo spots.', category: 'Collectibles', tier: 'Bronze' },
  { id: 't-11', title: 'Full Deck', description: 'Collect every special playing card.', category: 'Collectibles', tier: 'Silver' },
  { id: 't-12', title: 'Treasure Hunter', description: 'Complete a full treasure map.', category: 'Collectibles', tier: 'Bronze' }
];
