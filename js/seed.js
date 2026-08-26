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
      displayName: 'GTA6 Walkthrough Staff',
      bio: 'Official account. Announcements and rule changes.',
      role: 'Admin',
      joinedAt: '2025-08-01',
      location: 'Everywhere'
    }
  ],
  walkthroughs: [
    {
      id: 'wt-1',
      title: 'Prologue: Getting Out of Town',
      game: 'GTA 6',
      difficulty: 'easy',
      duration: 25,
      author: 'nova',
      updatedAt: '2026-08-12',
      cover: '🚗',
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
      difficulty: 'medium',
      duration: 180,
      author: 'mapmaker',
      updatedAt: '2026-08-20',
      cover: '🗺️',
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
      difficulty: 'hard',
      duration: 45,
      author: 'sable',
      updatedAt: '2026-08-25',
      cover: '🎯',
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
      difficulty: 'easy',
      duration: 60,
      author: 'nova',
      updatedAt: '2026-08-18',
      cover: '💰',
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
      id: 'th-1',
      title: 'Best settings for 60fps on mid-range hardware?',
      category: 'Tech',
      author: 'pixelpush',
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
      createdAt: '2026-08-01',
      body: 'New here? Say hello and tell us what you are playing.',
      replies: []
    }
  ]
};

export const CATEGORIES = ['General', 'Guides', 'Tech', 'Off-topic'];
