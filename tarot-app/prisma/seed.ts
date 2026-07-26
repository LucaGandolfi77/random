import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const existingCards = await prisma.card.count()
  if (existingCards > 0) {
    console.log('Database already seeded. Skipping.')
    return
  }

  const deck = await prisma.deck.create({
    data: {
      slug: 'rws',
      name: 'Rider-Waite-Smith',
      description: 'The classic 1910 tarot deck by Arthur Edward Waite and Pamela Colman Smith. Public domain.',
      isDefault: true,
      cost: 0,
      sortOrder: 0,
      themeJson: JSON.stringify({
        cardBack: '#4a2c6d',
        frameColor: '#d4a843',
        nameColor: '#2a1a3d',
      }),
    },
  })

  await prisma.deck.createMany({
    data: [
      {
        slug: 'marseille', name: 'Marseille', description: 'A classic 18th-century Marseille-style deck with warm golden tones.',
        cost: 500, isDefault: false, sortOrder: 1,
        themeJson: JSON.stringify({ cardBack: '#8b4513', frameColor: '#c9a84c', nameColor: '#3a2006' }),
      },
      {
        slug: 'shadow', name: 'Shadow Deck', description: 'A dark, esoteric deck with deep violet and silver accents.',
        cost: 800, isDefault: false, sortOrder: 2,
        themeJson: JSON.stringify({ cardBack: '#1a0a2e', frameColor: '#9b59b6', nameColor: '#d4a843' }),
      },
    ],
  })

  const majorArcana = [
    { name: 'The Fool', rank: '0', upright: 'New beginnings, innocence, spontaneity, free spirit. The Fool represents a fresh start and a leap of faith into the unknown. Trust the journey ahead and embrace the adventure that awaits.', reversed: 'Recklessness, risk-taking, naivety, being taken advantage of. The reversed Fool warns against acting without thought. Take time to consider the consequences before making a hasty decision.', keywords: 'beginnings, innocence, adventure, spontaneity, trust' },
    { name: 'The Magician', rank: '1', upright: 'Willpower, skill, confidence, manifestation. The Magician signifies that you have all the tools needed to succeed. Focus your energy and bring your vision to life.', reversed: 'Trickery, manipulation, untapped potential, deception. The reversed Magician warns of misuse of power or being misled. Look within — you have more resources than you realize.', keywords: 'willpower, skill, creation, manifestation, resourcefulness' },
    { name: 'The High Priestess', rank: '2', upright: 'Intuition, mystery, inner knowledge, the subconscious. The High Priestess calls you to trust your inner voice. Wisdom lies not in the external world but in the depths of your soul.', reversed: 'Secrets, withdrawal, silence, ignoring intuition. The reversed High Priestess suggests you are not listening to your inner wisdom. Take time to be still and tune in.', keywords: 'intuition, mystery, wisdom, subconscious, inner voice' },
    { name: 'The Empress', rank: '3', upright: 'Femininity, abundance, nature, nurturing. The Empress represents creativity, fertility, and the beauty of the natural world. Allow yourself to be nurtured and to nurture others.', reversed: 'Creative block, dependence, emptiness, neglect. The reversed Empress suggests a disconnect from your creative energy. Reconnect with nature and your own sensuality.', keywords: 'femininity, abundance, nature, creativity, nurturing' },
    { name: 'The Emperor', rank: '4', upright: 'Authority, structure, stability, protection. The Emperor represents solid foundations, leadership, and the power of order. Take charge of your life with discipline and confidence.', reversed: 'Tyranny, rigidity, lack of discipline, overcontrol. The reversed Emperor warns against excessive control or stubbornness. Flexibility is needed in this situation.', keywords: 'authority, structure, stability, leadership, discipline' },
    { name: 'The Hierophant', rank: '5', upright: 'Tradition, spiritual guidance, conformity, education. The Hierophant represents established beliefs and conventional wisdom. Seek guidance from trusted institutions or mentors.', reversed: 'Rebellion, nonconformity, unorthodoxy, challenging the status quo. The reversed Hierophant encourages you to question tradition and find your own truth.', keywords: 'tradition, guidance, conformity, wisdom, mentorship' },
    { name: 'The Lovers', rank: '6', upright: 'Love, harmony, relationships, choices, alignment. The Lovers represent deep connection and meaningful choices. Follow your heart and stay true to your values.', reversed: 'Disharmony, imbalance, misalignment, broken relationships. The reversed Lovers signals conflict in relationships or a difficult choice. Seek balance and honest communication.', keywords: 'love, harmony, choices, relationships, alignment' },
    { name: 'The Chariot', rank: '7', upright: 'Determination, willpower, victory, self-discipline. The Chariot represents triumph through focused effort and inner strength. Push forward with confidence — success is within reach.', reversed: 'Lack of control, aggression, defeat, no direction. The reversed Chariot suggests a loss of focus or being overwhelmed. Reassert your will and find your center.', keywords: 'victory, determination, willpower, conquest, ambition' },
    { name: 'Strength', rank: '8', upright: 'Courage, inner strength, compassion, resilience. Strength represents the quiet power of patience and gentle persuasion. True strength comes from the heart, not force.', reversed: 'Self-doubt, weakness, insecurity, lack of courage. The reversed Strength indicates you may be doubting your abilities. Trust in your inner resilience to overcome challenges.', keywords: 'courage, inner strength, compassion, resilience, patience' },
    { name: 'The Hermit', rank: '9', upright: 'Solitude, introspection, wisdom, soul-searching. The Hermit invites you to withdraw and seek answers within. Solitude brings clarity and deeper understanding.', reversed: 'Isolation, loneliness, withdrawal, being lost. The reversed Hermit suggests you may be isolating too much. Reach out to others while maintaining your inner journey.', keywords: 'solitude, introspection, wisdom, guidance, contemplation' },
    { name: 'Wheel of Fortune', rank: '10', upright: 'Change, cycles, fate, fortune, turning point. The Wheel of Fortune signals a shift in circumstances. Embrace change — the wheel always turns and new opportunities arise.', reversed: 'Bad luck, resistance to change, setbacks, broken cycles. The reversed Wheel suggests fear of change or feeling stuck. Let go of control and trust the process.', keywords: 'change, cycles, fate, fortune, turning point' },
    { name: 'Justice', rank: '11', upright: 'Fairness, truth, law, cause and effect. Justice represents accountability and balanced decisions. The truth will prevail — act with integrity.', reversed: 'Injustice, dishonesty, lack of accountability, unfairness. The reversed Justice warns of imbalance or untruth. Examine your actions and seek fairness.', keywords: 'fairness, truth, justice, balance, accountability' },
    { name: 'The Hanged Man', rank: '12', upright: 'Surrender, new perspective, suspension, pause. The Hanged Man invites you to see things from a different angle. Sometimes the best action is to wait and reflect.', reversed: 'Stalling, resistance, indecision, martyrdom. The reversed Hanged Man suggests you are resisting necessary change. Let go of control to gain a new view.', keywords: 'surrender, perspective, pause, sacrifice, release' },
    { name: 'Death', rank: '13', upright: 'Transformation, endings, change, transition. Death represents the end of one cycle and the beginning of another. Release what no longer serves you to make room for growth.', reversed: 'Resistance to change, stagnation, fear of endings, repetition. The reversed Death indicates clinging to the past. Embrace transformation to move forward.', keywords: 'transformation, endings, change, transition, rebirth' },
    { name: 'Temperance', rank: '14', upright: 'Balance, moderation, patience, harmony. Temperance represents the art of finding equilibrium. Blend opposing forces with patience and grace.', reversed: 'Imbalance, excess, lack of harmony, extremes. The reversed Temperance warns of going to extremes. Find the middle path to restore peace.', keywords: 'balance, moderation, patience, harmony, blending' },
    { name: 'The Devil', rank: '15', upright: 'Bondage, materialism, obsession, shadow self. The Devil represents attachment to worldly desires and unhealthy patterns. Recognize what holds you captive and reclaim your power.', reversed: 'Release, breaking free, enlightenment, reclaiming power. The reversed Devil signals liberation from toxic patterns. You have the strength to break the chains.', keywords: 'bondage, materialism, obsession, shadow, temptation' },
    { name: 'The Tower', rank: '16', upright: 'Sudden change, upheaval, revelation, chaos. The Tower represents a dramatic shake-up that destroys old structures. Though painful, this clearing makes way for something new.', reversed: 'Avoidance of disaster, resisting change, delayed upheaval. The reversed Tower suggests you may be averting a crisis temporarily. True stability requires honest confrontation.', keywords: 'upheaval, change, revelation, destruction, awakening' },
    { name: 'The Star', rank: '17', upright: 'Hope, inspiration, serenity, purpose, healing. The Star is a beacon of light after turbulent times. Trust the universe and have faith in your path.', reversed: 'Despair, hopelessness, lack of faith, discouragement. The reversed Star suggests feeling lost or disconnected. Rekindle your inner light and believe in renewal.', keywords: 'hope, inspiration, serenity, purpose, healing' },
    { name: 'The Moon', rank: '18', upright: 'Illusion, fear, anxiety, subconscious, intuition. The Moon reveals that not everything is as it seems. Trust your intuition to navigate through uncertainty and hidden truths.', reversed: 'Release of fear, clarity, understanding, overcoming anxiety. The reversed Moon signals that hidden truths are coming to light. Face your fears and find clarity.', keywords: 'illusion, fear, anxiety, intuition, mystery' },
    { name: 'The Sun', rank: '19', upright: 'Positivity, success, vitality, joy, celebration. The Sun represents radiant happiness and achievement. Bask in the warmth of your accomplishments and share your joy.', reversed: 'Temporary sadness, lack of enthusiasm, overexposure. The reversed Sun suggests a cloud over your happiness. Remember that the sun always returns after the clouds pass.', keywords: 'success, joy, vitality, celebration, confidence' },
    { name: 'Judgement', rank: '20', upright: 'Judgement, rebirth, inner calling, absolution. Judgement represents a powerful awakening and a call to fulfill your purpose. Rise to your highest potential and answer the call.', reversed: 'Self-doubt, refusal of self-evaluation, fear of judgement. The reversed Judgement indicates avoiding necessary self-reflection. Embrace honest assessment to grow.', keywords: 'rebirth, judgment, awakening, purpose, evaluation' },
    { name: 'The World', rank: '21', upright: 'Completion, accomplishment, fulfillment, integration. The World represents the successful end of a major cycle. You have reached a milestone — celebrate and prepare for the next journey.', reversed: 'Incompletion, delay, stagnation, lack of closure. The reversed World suggests unfinished business or missed opportunities. Tie up loose ends to find closure.', keywords: 'completion, accomplishment, fulfillment, integration, wholeness' },
  ]

  const suits = ['wands', 'cups', 'swords', 'pentacles']
  const suitElements: Record<string, { theme: string; uprightTheme: string; reversedTheme: string }> = {
    wands: { theme: 'Passion, energy, creativity, action', uprightTheme: 'When this card appears, creative energy and ambition drive you forward.', reversedTheme: 'In reverse, this energy may feel blocked or misdirected.' },
    cups: { theme: 'Emotions, relationships, intuition, love', uprightTheme: 'This card speaks to matters of the heart and emotional fulfillment.', reversedTheme: 'When reversed, emotional challenges or imbalance may be present.' },
    swords: { theme: 'Intellect, communication, truth, conflict', uprightTheme: 'This card calls you to face the truth with clarity and mental strength.', reversedTheme: 'Reversed, mental confusion or unnecessary conflict may arise.' },
    pentacles: { theme: 'Material world, work, health, prosperity', uprightTheme: 'This card grounds you in practical matters and tangible results.', reversedTheme: 'In reverse, financial or health challenges may need attention.' },
  }
  const ranks = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Page', 'Knight', 'Queen', 'King']
  const rankMeanings: Record<string, { upright: string; reversed: string }> = {
    'Ace': { upright: 'A new beginning, potential, opportunity, the seed of something powerful.', reversed: 'A delayed start, missed opportunity, blocked potential, the need to wait.' },
    '2': { upright: 'Balance, partnership, duality, choices, the need to find harmony.', reversed: 'Imbalance, conflict, difficult choices, separation, the need for compromise.' },
    '3': { upright: 'Growth, expansion, collaboration, progress through teamwork.', reversed: 'Misalignment, lack of progress, limited collaboration, delays caused by others.' },
    '4': { upright: 'Stability, structure, foundation, consolidation, resting after effort.', reversed: 'Instability, lack of structure, restlessness, feeling stuck or confined.' },
    '5': { upright: 'Conflict, competition, challenge, loss, a test of resilience.', reversed: 'Reconciliation, compromise, moving past conflict, learning from hardship.' },
    '6': { upright: 'Success, harmony, progress, sharing, receiving recognition.', reversed: 'Arrogance, lack of generosity, blocked success, holding on too tightly.' },
    '7': { upright: 'Perseverance, challenge, defense, standing your ground.', reversed: 'Giving up, overwhelmed, feeling defeated, the need to reassess.' },
    '8': { upright: 'Speed, movement, progress, action, forward momentum.', reversed: 'Slowdown, delays, frustration, lack of direction, the need to pause.' },
    '9': { upright: 'Wisdom, accomplishment, fulfillment, nearing completion.', reversed: 'Unfulfilled, regret, nearing a dead end, lack of satisfaction.' },
    '10': { upright: 'Completion, burden, ending of a cycle, culmination.', reversed: 'Release, recovery, light at the end of the tunnel, learning from the past.' },
    'Page': { upright: 'Curiosity, new ideas, youthful energy, messenger, exploration.', reversed: 'Immaturity, lack of direction, procrastination, missed messages.' },
    'Knight': { upright: 'Action, adventure, pursuit, passion, charging forward.', reversed: 'Rashness, aggression, impulsiveness, burnout, scattered energy.' },
    'Queen': { upright: 'Nurturing, emotional depth, maturity, inner wisdom, care.', reversed: 'Emotional insecurity, dependence, codependency, self-neglect.' },
    'King': { upright: 'Authority, leadership, mastery, control, confident decision-making.', reversed: 'Tyranny, rigidity, misuse of power, stubbornness, coldness.' },
  }

  const minorKeywords: Record<string, string> = {
    'Ace': 'beginning, potential, opportunity, seed',
    '2': 'balance, partnership, choice, harmony',
    '3': 'growth, expansion, collaboration, teamwork',
    '4': 'stability, structure, foundation, rest',
    '5': 'conflict, competition, challenge, loss',
    '6': 'success, harmony, progress, sharing',
    '7': 'perseverance, challenge, defense, stance',
    '8': 'speed, movement, progress, action',
    '9': 'wisdom, accomplishment, fulfillment, nearing end',
    '10': 'completion, burden, ending, culmination',
    'Page': 'curiosity, messenger, youth, exploration',
    'Knight': 'action, adventure, passion, pursuit',
    'Queen': 'nurturing, emotional depth, maturity, care',
    'King': 'authority, leadership, mastery, control',
  }

  const minorArcanaCards: { name: string; suit: string; rank: string }[] = []
  for (const suit of suits) {
    for (const rank of ranks) {
      minorArcanaCards.push({ name: `${rank} of ${suit.charAt(0).toUpperCase() + suit.slice(1)}`, suit, rank })
    }
  }

  const imageName = (card: { name: string; rank?: string | null }): string => {
    if (card.rank === undefined) return 'placeholder.jpg'
    if (majorArcana.some(m => m.rank === card.rank)) {
      return `major-${String(card.rank).padStart(2, '0')}.jpg`
    }
    return 'placeholder.jpg'
  }

  let sortOrder = 0
  const allCards: any[] = []

  for (const card of majorArcana) {
    allCards.push({
      deckId: deck.id,
      name: card.name,
      arcana: 'major',
      suit: null,
      rank: card.rank,
      uprightMeaning: card.upright,
      reversedMeaning: card.reversed,
      keywords: card.keywords,
      imagePath: imageName({ name: card.name, rank: card.rank }),
      sortOrder: sortOrder++,
    })
  }

  for (const item of minorArcanaCards) {
    const element = suitElements[item.suit]
    const meaning = rankMeanings[item.rank]
    allCards.push({
      deckId: deck.id,
      name: item.name,
      arcana: 'minor',
      suit: item.suit,
      rank: item.rank.toLowerCase(),
      uprightMeaning: `${element.theme}. ${element.uprightTheme} ${meaning.upright}`,
      reversedMeaning: `${element.theme}. ${element.reversedTheme} ${meaning.reversed}`,
      keywords: minorKeywords[item.rank] || '',
      imagePath: `${item.suit}-${item.rank.toLowerCase()}.jpg`,
      sortOrder: sortOrder++,
    })
  }

  await prisma.card.createMany({ data: allCards })
  console.log(`  ✓ ${allCards.length} cards created`)

  await prisma.spread.createMany({
    data: [
      {
        slug: 'single', name: 'Single Card', description: 'A simple one-card draw for quick guidance on any question.',
        positionsJson: JSON.stringify([{ key: 'single', label: 'The Card', x: 0.5, y: 0.5 }]),
        cardCount: 1, cost: 0, isDefault: true, sortOrder: 0,
      },
      {
        slug: 'three-card', name: 'Past / Present / Future', description: 'A three-card spread revealing the timeline of your situation.',
        positionsJson: JSON.stringify([
          { key: 'past', label: 'Past', x: 0.15, y: 0.5 },
          { key: 'present', label: 'Present', x: 0.5, y: 0.5 },
          { key: 'future', label: 'Future', x: 0.85, y: 0.5 },
        ]),
        cardCount: 3, cost: 0, isDefault: true, sortOrder: 1,
      },
      {
        slug: 'yes-no', name: 'Yes / No', description: 'A focused one-card draw that answers with the energy of the card.',
        positionsJson: JSON.stringify([{ key: 'answer', label: 'Answer', x: 0.5, y: 0.5 }]),
        cardCount: 1, cost: 150, isDefault: false, sortOrder: 2,
      },
      {
        slug: 'love', name: 'Love Spread', description: 'A five-card spread exploring romantic relationships.',
        positionsJson: JSON.stringify([
          { key: 'you', label: 'You', x: 0.2, y: 0.2 },
          { key: 'partner', label: 'Partner', x: 0.8, y: 0.2 },
          { key: 'strengths', label: 'Strengths', x: 0.35, y: 0.5 },
          { key: 'challenges', label: 'Challenges', x: 0.65, y: 0.5 },
          { key: 'outcome', label: 'Outcome', x: 0.5, y: 0.8 },
        ]),
        cardCount: 5, cost: 250, isDefault: false, sortOrder: 3,
      },
      {
        slug: 'horseshoe', name: 'Horseshoe', description: 'A seven-card horseshoe spread covering key influences around your question.',
        positionsJson: JSON.stringify([
          { key: 'past', label: 'Past', x: 0.08, y: 0.15 },
          { key: 'present', label: 'Present', x: 0.25, y: 0.08 },
          { key: 'hidden', label: 'Hidden Influences', x: 0.45, y: 0.05 },
          { key: 'obstacles', label: 'Obstacles', x: 0.63, y: 0.08 },
          { key: 'external', label: 'External Influences', x: 0.78, y: 0.15 },
          { key: 'hopes', label: 'Hopes & Fears', x: 0.85, y: 0.35 },
          { key: 'outcome', label: 'Outcome', x: 0.5, y: 0.55 },
        ]),
        cardCount: 7, cost: 250, isDefault: false, sortOrder: 4,
      },
      {
        slug: 'celtic-cross', name: 'Celtic Cross', description: 'The classic ten-card spread for deep, comprehensive insight.',
        positionsJson: JSON.stringify([
          { key: 'center', label: 'Present', x: 0.35, y: 0.4 },
          { key: 'crossing', label: 'Challenge', x: 0.35, y: 0.4 },
          { key: 'below', label: 'Foundation', x: 0.35, y: 0.65 },
          { key: 'behind', label: 'Past', x: 0.1, y: 0.4 },
          { key: 'above', label: 'Goal', x: 0.35, y: 0.15 },
          { key: 'ahead', label: 'Future', x: 0.6, y: 0.4 },
          { key: 'self', label: 'Self', x: 0.7, y: 0.05 },
          { key: 'environment', label: 'Environment', x: 0.7, y: 0.2 },
          { key: 'hopes', label: 'Hopes & Fears', x: 0.7, y: 0.4 },
          { key: 'outcome', label: 'Outcome', x: 0.7, y: 0.6 },
        ]),
        cardCount: 10, cost: 300, isDefault: false, sortOrder: 5,
      },
    ],
  })
  console.log('  ✓ 6 spreads created')

  await prisma.achievement.createMany({
    data: [
      { slug: 'first-reading', name: 'First Steps', description: 'Complete your first reading', coinsReward: 15, xpReward: 20 },
      { slug: 'ten-readings', name: 'Seeker', description: 'Complete 10 readings', coinsReward: 30, xpReward: 50 },
      { slug: 'fifty-readings', name: 'Oracle', description: 'Complete 50 readings', coinsReward: 75, xpReward: 150 },
      { slug: 'streak-3', name: 'Three-Day Journey', description: 'Reach a 3-day login streak', coinsReward: 10, xpReward: 15 },
      { slug: 'streak-7', name: 'Aligned Week', description: 'Reach a 7-day login streak', coinsReward: 25, xpReward: 50 },
      { slug: 'streak-30', name: 'Moon Cycle', description: 'Reach a 30-day login streak', coinsReward: 100, xpReward: 200 },
      { slug: 'first-celtic', name: 'Deep Dive', description: 'Complete a Celtic Cross reading', coinsReward: 25, xpReward: 40 },
      { slug: 'first-unlock', name: 'Collector', description: 'Unlock your first item from the shop', coinsReward: 0, xpReward: 30 },
      { slug: 'major-collector', name: 'Arcane Master', description: 'Draw all 22 Major Arcana cards at least once', coinsReward: 50, xpReward: 100 },
      { slug: 'fortune-explorer', name: 'Fortune Seeker', description: 'Use 5 different fortune tools', coinsReward: 30, xpReward: 50 },
    ],
  })
  console.log('  ✓ 10 achievements created')

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
