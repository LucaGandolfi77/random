const horoscopeDeck = [
  {
    title: 'Mercury enters Bratwurst',
    guidance: 'Your emotional ketchup energy is hot but unstable. Say less, plate more.',
    luck: 78,
    destiny: 82,
  },
  {
    title: 'Moon in Currywurst',
    guidance: 'A luxury condiment appears in your orbit. Accept the compliment and the carbs.',
    luck: 71,
    destiny: 88,
  },
  {
    title: 'Neon Grill Alignment',
    guidance: 'Your aura is louder than your group chat. Channel it into a recipe, not a subtweet.',
    luck: 84,
    destiny: 74,
  },
  {
    title: 'Sausage Saturn Return',
    guidance: 'You are being tested by dry buns and weak playlists. Persist with chrome confidence.',
    luck: 66,
    destiny: 81,
  },
  {
    title: 'Bun Eclipse Mode',
    guidance: 'Avoid nostalgic mustard. Today rewards people who flirt like a concept album.',
    luck: 89,
    destiny: 77,
  },
  {
    title: 'Cosmic Grill Window',
    guidance: 'The right chaos is magnetic. Let the wrong condiment fear you from a distance.',
    luck: 76,
    destiny: 86,
  },
  {
    title: 'Vaporwave Condiment Tide',
    guidance: 'Someone from your past is reheating. Stay premium, stay toasted, stay mysterious.',
    luck: 81,
    destiny: 79,
  },
]

const condimentWarnings = [
  'Cursed relish may reopen old DMs.',
  'Do not trust anyone serving room-temperature mayo mysticism.',
  'A suspicious aioli is impersonating stability.',
  'Beware of nostalgic ketchup after 21:00.',
  'The mustard moon makes flaky people feel poetic.',
]

export const personalities = [
  {
    id: 'cyber-bratwurst',
    name: 'Cyber Bratwurst',
    subtitle: 'Chrome charisma with nightclub-grade optimism.',
    aura: '#36f5dd',
    glow: '#36f5dd',
    accent: '#ff7a45',
    body: ['#f7c08a', '#c96934'],
    palette: ['#0d1324', '#194163', '#36f5dd'],
    traits: ['hyper-social', 'synth-driven', 'future-flirt'],
    music: 'Hyperpop x Italo club',
    philosophy: 'If the grill is glowing, destiny is already rendering.',
    metrics: { romantic: 79, friendship: 74, chaos: 87, grill: 93, meme: 95 },
  },
  {
    id: 'sad-hotdog',
    name: 'Sad Hotdog',
    subtitle: 'Tender, cinematic, and suspiciously photogenic in the rain.',
    aura: '#93b2ff',
    glow: '#93b2ff',
    accent: '#7f8cff',
    body: ['#f2be92', '#bc7241'],
    palette: ['#141525', '#2d3868', '#93b2ff'],
    traits: ['soft-focus', 'playlist hoarder', 'emotionally sincere'],
    music: 'Dream pop and sad eurodance',
    philosophy: 'Every bun collapse is also a rebrand opportunity.',
    metrics: { romantic: 92, friendship: 81, chaos: 51, grill: 58, meme: 77 },
  },
  {
    id: 'alpine-grillmaster',
    name: 'Alpine Grillmaster',
    subtitle: 'Peak competence wearing a mountain sunrise.',
    aura: '#ffcf66',
    glow: '#ffcf66',
    accent: '#ff9a3d',
    body: ['#f3c37a', '#bc6b21'],
    palette: ['#1f1621', '#6b401f', '#ffcf66'],
    traits: ['host energy', 'protective', 'dangerously good at brunch'],
    music: 'Indie folk with bass boost',
    philosophy: 'Respect the flame and your friends will follow.',
    metrics: { romantic: 76, friendship: 94, chaos: 43, grill: 97, meme: 67 },
  },
  {
    id: 'chaos-frankfurter',
    name: 'Chaos Frankfurter',
    subtitle: 'A glittering red flag with elite comedic timing.',
    aura: '#ff5a72',
    glow: '#ff5a72',
    accent: '#ff9d48',
    body: ['#f7ad78', '#c45b31'],
    palette: ['#220e1f', '#6b1b36', '#ff5a72'],
    traits: ['magnetic', 'feral', 'main-character crisis'],
    music: 'Brazilian phonk and midnight edits',
    philosophy: 'A little chaos keeps the relish honest.',
    metrics: { romantic: 72, friendship: 69, chaos: 98, grill: 84, meme: 92 },
  },
  {
    id: 'neon-vegan-wurst',
    name: 'Neon Vegan Wurst',
    subtitle: 'Plant-based, future-facing, and cooler than your ex.',
    aura: '#57ffb2',
    glow: '#57ffb2',
    accent: '#00c8ff',
    body: ['#d6d786', '#7bb851'],
    palette: ['#07161c', '#0c4b4a', '#57ffb2'],
    traits: ['ethereal', 'tastefully smug', 'trend-setting'],
    music: 'House, jersey club, and eco rave',
    philosophy: 'Luxury is a vibe, not an ingredient list.',
    metrics: { romantic: 74, friendship: 86, chaos: 63, grill: 69, meme: 88 },
  },
  {
    id: 'existential-currywurst',
    name: 'Existential Currywurst',
    subtitle: 'Spicy, introspective, and one monologue away from transcendence.',
    aura: '#ff9f3a',
    glow: '#ff9f3a',
    accent: '#ff5e47',
    body: ['#f4be74', '#b7582d'],
    palette: ['#21130d', '#593019', '#ff9f3a'],
    traits: ['deep thinker', 'late-night texter', 'poetically dramatic'],
    music: 'Trip-hop and orchestral trap',
    philosophy: 'Meaning is temporary. Sauce is eternal.',
    metrics: { romantic: 84, friendship: 79, chaos: 76, grill: 72, meme: 83 },
  },
  {
    id: 'sigma-bockwurst',
    name: 'Sigma Bockwurst',
    subtitle: 'Minimal words, maximum aura, terrifyingly efficient hair.',
    aura: '#c6f1ff',
    glow: '#c6f1ff',
    accent: '#78d2ff',
    body: ['#edb37f', '#af6033'],
    palette: ['#10141c', '#2c4259', '#c6f1ff'],
    traits: ['controlled', 'mysterious', 'terribly quotable'],
    music: 'Dark synthwave and precision techno',
    philosophy: 'Silence grills louder than noise.',
    metrics: { romantic: 61, friendship: 68, chaos: 58, grill: 95, meme: 81 },
  },
  {
    id: 'dark-academia-sausage',
    name: 'Dark Academia Sausage',
    subtitle: 'Velvet melancholy served with impossible handwriting.',
    aura: '#d7b0ff',
    glow: '#d7b0ff',
    accent: '#7e56ff',
    body: ['#e5b288', '#9b5737'],
    palette: ['#170f23', '#3a1c46', '#d7b0ff'],
    traits: ['bookish', 'seductive', 'chronically over-curated'],
    music: 'Chamber pop and smoky jazz edits',
    philosophy: 'A tasteful crumble is still a kind of immortality.',
    metrics: { romantic: 88, friendship: 72, chaos: 67, grill: 65, meme: 90 },
  },
]

export const onboardingSlides = [
  {
    eyebrow: 'Gen Z grill couture',
    title: 'The sausage app that behaves like a social myth.',
    body: 'Scroll memes, decode your wurstel DNA, and collect a premium identity that feels weirdly too accurate.',
    accent: 'WurstFeed',
  },
  {
    eyebrow: 'Personality engine',
    title: 'Every tap sharpens your sausage archetype.',
    body: 'Your quiz result powers compatibility, rankings, and the social aura printed across your profile.',
    accent: 'DNA quiz',
  },
  {
    eyebrow: 'PWA ritual',
    title: 'Install it, flex it, use it offline at 2AM.',
    body: 'Home screen ready, splash loaded, cached for chaos, optimized for glossy iPhone proportions.',
    accent: 'Add to home screen',
  },
]

export const feedCards = [
  {
    id: 'wisdom-card',
    type: 'wisdom',
    label: 'Daily wurstel wisdom',
    title: 'Never chase closure when you can chase crispness.',
    body: 'Today rewards premium absurdity. Trust the glowing grill, not the lukewarm situationship.',
    palette: ['#ff9f62', '#ff5f8a', '#6126ff'],
    stats: ['12.4k saves', '94% aura sync'],
    reactions: ['Flame', 'Mood', 'Relatable'],
  },
  {
    id: 'fake-news-card',
    type: 'headline',
    label: 'Fake news alert',
    title: 'Economists panic as Mercury enters Bratwurst and mustard futures spike.',
    body: 'Analysts report a surge in emotional grilling and risky rooftop condiments by sunset.',
    palette: ['#0f1e42', '#127f9b', '#10e0c6'],
    stats: ['8.3k reposts', '11 senate inquiries'],
    reactions: ['Unwell', 'Invest', 'Lore'],
  },
  {
    id: 'meme-card',
    type: 'meme',
    label: 'Meme pulse',
    title: 'Me pretending I am stable while my ketchup moon enters retrograde.',
    body: 'Comment sections agree: this is elite bun avoidance behavior.',
    palette: ['#221326', '#5b2f84', '#ff46b8'],
    stats: ['6.9M loops', '4.1k duets'],
    reactions: ['Actually me', 'Crying', 'Bookmark'],
  },
  {
    id: 'poll-card',
    type: 'poll',
    label: 'Hot poll',
    title: 'Who survives a rooftop breakup dinner with the most aura?',
    body: 'Cast your vote. The grill council is watching with glossy concern.',
    palette: ['#120d18', '#5d2532', '#ff7d45'],
    options: ['chaos-frankfurter', 'dark-academia-sausage', 'sad-hotdog'],
  },
]

export const quizQuestions = [
  {
    id: 'friday-night',
    prompt: 'It is Friday night. Your first instinct is...',
    mood: 'Neon confidence',
    palette: ['#ff9c58', '#ff4e7f'],
    answers: [
      {
        key: 'rooftop-loop',
        label: 'Rooftop pregame, chrome jacket, playlist already scheduled.',
        vibe: 'High-gloss extrovert',
        impact: { 'cyber-bratwurst': 3, 'chaos-frankfurter': 2 },
      },
      {
        key: 'rainy-window',
        label: 'Window seat, dramatic snack, and a suspiciously perfect selfie.',
        vibe: 'Tender and iconic',
        impact: { 'sad-hotdog': 3, 'dark-academia-sausage': 2 },
      },
      {
        key: 'host-mode',
        label: 'Invite everyone over and somehow also grill for twelve.',
        vibe: 'Peak competence',
        impact: { 'alpine-grillmaster': 3, 'sigma-bockwurst': 1 },
      },
      {
        key: 'eco-rave',
        label: 'Open-air pop-up with biodegradable glitter and very curated lighting.',
        vibe: 'Ethical slay',
        impact: { 'neon-vegan-wurst': 3, 'cyber-bratwurst': 1 },
      },
    ],
  },
  {
    id: 'coping-sauce',
    prompt: 'Your preferred post-chaos condiment is...',
    mood: 'Emotional heat',
    palette: ['#ff8949', '#ffcf66'],
    answers: [
      {
        key: 'garlic-plasma',
        label: 'Black garlic plasma with dramatic restraint.',
        vibe: 'Controlled menace',
        impact: { 'sigma-bockwurst': 3, 'dark-academia-sausage': 1 },
      },
      {
        key: 'curry-confession',
        label: 'Molten curry drizzle that somehow asks metaphysical questions.',
        vibe: 'Philosophically spicy',
        impact: { 'existential-currywurst': 3, 'chaos-frankfurter': 1 },
      },
      {
        key: 'teal-mayo',
        label: 'Yuzu cloud mayo in a bottle too futuristic to trust.',
        vibe: 'Techno tenderness',
        impact: { 'cyber-bratwurst': 2, 'neon-vegan-wurst': 2 },
      },
      {
        key: 'plain-ketchup',
        label: 'Classic ketchup because your sadness deserves familiar architecture.',
        vibe: 'Cinematic comfort',
        impact: { 'sad-hotdog': 3, 'alpine-grillmaster': 1 },
      },
    ],
  },
  {
    id: 'group-chat-role',
    prompt: 'Inside the group chat you are mostly...',
    mood: 'Social aura',
    palette: ['#10e0c6', '#1b7eff'],
    answers: [
      {
        key: 'voice-note',
        label: 'The chaotic voice note with breaking news and three outfit options.',
        vibe: 'Loud, fast, effective',
        impact: { 'chaos-frankfurter': 3, 'cyber-bratwurst': 1 },
      },
      {
        key: 'calendar-genius',
        label: 'The logistics machine who books everything before anyone asks.',
        vibe: 'Protective authority',
        impact: { 'alpine-grillmaster': 3, 'sigma-bockwurst': 1 },
      },
      {
        key: 'meme-oracle',
        label: 'The meme oracle who speaks in elite screenshots and condensed pain.',
        vibe: 'Quiet devastation',
        impact: { 'sad-hotdog': 2, 'dark-academia-sausage': 2 },
      },
      {
        key: 'green-future',
        label: 'The tastemaker who drops the niche link before it trends.',
        vibe: 'Curated prophecy',
        impact: { 'neon-vegan-wurst': 3, 'existential-currywurst': 1 },
      },
    ],
  },
  {
    id: 'late-night-thought',
    prompt: 'At 01:47 your brain suddenly whispers...',
    mood: 'Night signal',
    palette: ['#6975ff', '#ff5fc2'],
    answers: [
      {
        key: 'what-is-meaning',
        label: 'What is grilling if not a brief triumph over entropy?',
        vibe: 'Elegant spiral',
        impact: { 'existential-currywurst': 3, 'dark-academia-sausage': 2 },
      },
      {
        key: 'post-the-story',
        label: 'Post the story. Let the timeline deal with the consequences.',
        vibe: 'Hot and immediate',
        impact: { 'cyber-bratwurst': 2, 'chaos-frankfurter': 2 },
      },
      {
        key: 'text-nobody',
        label: 'Draft a paragraph. Send it to nobody. Feel extremely iconic.',
        vibe: 'Soft ruin',
        impact: { 'sad-hotdog': 3, 'dark-academia-sausage': 1 },
      },
      {
        key: 'sleep-actually',
        label: 'Sleep, because peak aura needs discipline.',
        vibe: 'Monk mode',
        impact: { 'sigma-bockwurst': 2, 'alpine-grillmaster': 2 },
      },
    ],
  },
  {
    id: 'party-fit',
    prompt: 'Pick the fit that feels the most like destiny.',
    mood: 'Visual fantasy',
    palette: ['#ff7c44', '#10e0c6'],
    answers: [
      {
        key: 'chrome-latex',
        label: 'Mirror-finish nylon with a fluorescent afterglow.',
        vibe: 'Future main character',
        impact: { 'cyber-bratwurst': 3, 'neon-vegan-wurst': 1 },
      },
      {
        key: 'velvet-notes',
        label: 'Deep plum velvet and a gaze that ruins semesters.',
        vibe: 'Poetic danger',
        impact: { 'dark-academia-sausage': 3, 'sad-hotdog': 1 },
      },
      {
        key: 'practical-fire',
        label: 'Heavy jacket, reliable boots, and a portable lighter that means business.',
        vibe: 'Built for survival',
        impact: { 'alpine-grillmaster': 3, 'sigma-bockwurst': 1 },
      },
      {
        key: 'reckless-red',
        label: 'Tiny sunglasses and a red piece that legally counts as a warning.',
        vibe: 'Unreasonably magnetic',
        impact: { 'chaos-frankfurter': 3, 'existential-currywurst': 1 },
      },
    ],
  },
  {
    id: 'soulmate-signal',
    prompt: 'Your soulmate smells mostly like...',
    mood: 'Compatibility voltage',
    palette: ['#ffb653', '#7f5fff'],
    answers: [
      {
        key: 'cedar-smoke',
        label: 'Cedar smoke, cold air, and terrifying competence.',
        vibe: 'Stable but hot',
        impact: { 'alpine-grillmaster': 2, 'sigma-bockwurst': 2 },
      },
      {
        key: 'vinyl-and-ozone',
        label: 'Vinyl sleeves, warm cables, and an illegal amount of charisma.',
        vibe: 'Electric charm',
        impact: { 'cyber-bratwurst': 2, 'chaos-frankfurter': 2 },
      },
      {
        key: 'ink-and-cocoa',
        label: 'Ink, cocoa, and elaborate emotional subtext.',
        vibe: 'Literary ache',
        impact: { 'dark-academia-sausage': 2, 'sad-hotdog': 2 },
      },
      {
        key: 'citrus-and-herbs',
        label: 'Citrus mist, fresh herbs, and a private access list.',
        vibe: 'Sustainable glamour',
        impact: { 'neon-vegan-wurst': 2, 'existential-currywurst': 2 },
      },
    ],
  },
]

export const tokClips = [
  {
    id: 'clip-1',
    title: 'Top 5 forbidden sausages after 02:13',
    caption: 'A vaporwave cooking edit narrated by someone who should not have this much access to neon mustard.',
    palette: ['#180e24', '#7428a1', '#ff5fc2'],
    metrics: { loops: '3.6M', likes: '182K', comments: '9.2K' },
    comments: ['this changed my aura', 'Mercury is fully in bratwurst', 'not the cursed aioli again'],
  },
  {
    id: 'clip-2',
    title: 'Luxury street-wurst plating with zero emotional boundaries',
    caption: 'Close-up flames, silver tongs, and one dramatic basil leaf doing way too much.',
    palette: ['#0d1020', '#145d88', '#36f5dd'],
    metrics: { loops: '2.1M', likes: '124K', comments: '5.6K' },
    comments: ['that garnish is emotionally unavailable', 'chef this is cinema', 'saved for my villain arc'],
  },
  {
    id: 'clip-3',
    title: 'Fake influencer reveals her grill morning routine',
    caption: 'Two affirmations, one chrome apron, and a suspiciously expensive sausage diffuser.',
    palette: ['#28131b', '#9a334e', '#ff9c58'],
    metrics: { loops: '4.2M', likes: '240K', comments: '15.8K' },
    comments: ['the diffuser???', 'manifesting bockwurst discipline', 'her bun budget is insane'],
  },
]

export const recipes = [
  {
    id: 'recipe-1',
    title: 'Cyberpunk Neon Dog',
    mood: 'Street food luxury',
    time: '11 min',
    ingredients: ['electric slaw', 'yuzu mayo fog', 'charred scallion glitter'],
    palette: ['#10131f', '#175078', '#10e0c6'],
  },
  {
    id: 'recipe-2',
    title: 'Sad 2AM Sausage Toast',
    mood: 'Soft devastation',
    time: '8 min',
    ingredients: ['butter grief', 'midnight onions', 'melancholy pepper'],
    palette: ['#17131f', '#394a85', '#a1b8ff'],
  },
  {
    id: 'recipe-3',
    title: 'Champagne Curry Spiral',
    mood: 'Experimental glam',
    time: '15 min',
    ingredients: ['curry lacquer', 'crispy basil static', 'gold onion lace'],
    palette: ['#28150b', '#8e4b1f', '#ffb653'],
  },
  {
    id: 'recipe-4',
    title: 'Alpine Afterparty Platter',
    mood: 'Party-proof comfort',
    time: '18 min',
    ingredients: ['mountain kraut', 'smoked apple gloss', 'fermented crunch'],
    palette: ['#14191a', '#336248', '#8ad58e'],
  },
]

export const leaderboard = [
  { id: 'sigma-bockwurst', name: 'Sigma Bockwurst', badge: 'Cold Smoke CEO', score: 97 },
  { id: 'chaos-frankfurter', name: 'Chaos Frankfurter', badge: 'Party Hazard', score: 94 },
  { id: 'dark-academia-sausage', name: 'Dark Academia Sausage', badge: 'Library Siren', score: 92 },
  { id: 'cyber-bratwurst', name: 'Cyber Bratwurst', badge: 'Glow Index Maxed', score: 90 },
]

export const weeklyQuests = [
  {
    id: 'quest-1',
    title: 'Vote in the Great Ranking',
    reward: '+12 aura',
  },
  {
    id: 'quest-2',
    title: 'Finish your DNA reveal and share the card',
    reward: '+1 chrome badge',
  },
  {
    id: 'quest-3',
    title: 'Craft one new builder identity',
    reward: '+7 grill reputation',
  },
]

export const builderOptions = {
  toppings: ['Yuzu lattice', 'Disco kraut', 'Truffle static', 'Champagne onions'],
  auras: ['Afterparty teal', 'Heartbreak magenta', 'Mystic saffron', 'Chrome silver'],
  grillLevels: ['Soft glow', 'Medium rare + gloss', 'Solar char', 'Forbidden crisp'],
  accessories: ['Chrome chain', 'Tiny sunglasses', 'Velvet ribbon', 'Angel halo'],
  soundtracks: ['Hyperpop sunrise', 'Sad synth eurodance', 'Grillwave deluxe', 'Opera phonk'],
  condiments: ['Black garlic plasma', 'Luxury curry drizzle', 'Pistachio relish', 'Smoked honey static'],
}

export function getPersonalityById(id) {
  return personalities.find((personality) => personality.id === id) ?? personalities[0]
}

export function calculateQuizResult(answers) {
  const scores = Object.fromEntries(personalities.map((personality) => [personality.id, 0]))

  answers.forEach((answer) => {
    Object.entries(answer.impact).forEach(([personalityId, score]) => {
      scores[personalityId] += score
    })
  })

  return Object.entries(scores).sort((left, right) => right[1] - left[1])[0][0]
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function computeCompatibility(leftId, rightId, modifiers) {
  const left = getPersonalityById(leftId)
  const right = getPersonalityById(rightId)
  const spiceDrift = (modifiers.spice - 50) * 0.45
  const trustLift = (modifiers.trust - 50) * 0.42
  const romantic = clamp(100 - Math.abs(left.metrics.romantic - right.metrics.romantic) * 0.7 + trustLift)
  const friendship = clamp(100 - Math.abs(left.metrics.friendship - right.metrics.friendship) * 0.65 + trustLift * 0.7)
  const chaos = clamp((left.metrics.chaos + right.metrics.chaos) / 2 + spiceDrift)
  const grill = clamp((left.metrics.grill + right.metrics.grill) / 2 + trustLift * 0.5)
  const meme = clamp(100 - Math.abs(left.metrics.meme - right.metrics.meme) * 0.55 + spiceDrift * 0.4)

  let summary = 'This duo feels sleek, unstable, and dangerously shareable.'
  if (romantic > 82 && chaos < 70) {
    summary = 'High chemistry, low mess. This is suspiciously healthy by WURSTVERSE standards.'
  } else if (chaos > 88) {
    summary = 'Maximum sparks, minimal insurance. Expect rooftop confessions and legendary memes.'
  } else if (friendship > 88) {
    summary = 'Comfort-first compatibility with excellent snack logistics and elite side quests.'
  }

  return {
    romantic,
    friendship,
    chaos,
    grill,
    meme,
    summary,
  }
}

export function buildIdentitySummary(builder) {
  const base = getPersonalityById(builder.baseId)

  return `${base.name} with ${builder.topping}, ${builder.condiment}, a ${builder.aura} aura, and ${builder.soundtrack} on loop.`
}

export function getDailyHoroscope(date = new Date()) {
  const deckEntry = horoscopeDeck[date.getDay()]
  const warning = condimentWarnings[date.getDate() % condimentWarnings.length]

  return {
    ...deckEntry,
    warning,
    sign: personalities[date.getDate() % personalities.length].name,
    luck: clamp(deckEntry.luck + (date.getDate() % 5) * 2),
    destiny: clamp(deckEntry.destiny + (date.getDay() % 4) * 3),
  }
}