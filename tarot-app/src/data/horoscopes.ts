import { mulberry32 } from '../lib/rng'

const texts: Record<string, Record<string, string[]>> = {
  love: {
    aries: ['Bold romantic energy surrounds you today. Take the lead in expressing your feelings.', 'Passion meets patience — a powerful combination for Aries in love.', 'Your confidence is magnetic. Let your authentic self shine through.'],
    taurus: ['Stability in love brings deep satisfaction today. Cherish the steady rhythms of your relationship.', 'Sensual pleasures await. Indulge in quality time with your beloved.', 'A practical gesture of love speaks louder than grand words today.'],
    gemini: ['Communication is your love language today. Share your thoughts freely and listen deeply.', 'Curiosity brings you closer. Ask the questions you\'ve been holding back.', 'A playful conversation could lead to a romantic breakthrough.'],
    cancer: ['Emotional depth is your gift today. Let your vulnerable side be seen.', 'Nurture your relationships with gentle care. Your intuition guides you.', 'Home and heart align. Create a cozy space for love to flourish.'],
    leo: ['Generosity in love lights up your relationships. Shine your warm heart on those you cherish.', 'Dramatic romance calls you. Express your love with flair and passion.', 'Your loyalty inspires devotion. Stay true to your heart\'s desires.'],
    virgo: ['Small acts of service speak volumes today. Show love through thoughtful attention to detail.', 'Perfectionism may block connection. Embrace the beautiful imperfections of love.', 'A practical conversation about the future brings clarity to the heart.'],
    libra: ['Harmony in relationships is your focus. Seek balance through honest communication.', 'Romance is in the air. Create beauty and peace in your partnerships.', 'Your diplomatic nature resolves tensions. Guide your relationships toward equilibrium.'],
    scorpio: ['Intense passion drives you today. Dive deep into emotional waters with trust.', 'Transformation in love is possible. Release old patterns that no longer serve.', 'Trust your instincts about a relationship. Your perception is razor-sharp.'],
    sagittarius: ['Adventurous love calls. Plan something spontaneous with your partner.', 'Optimism in relationships attracts positive energy. Keep your heart open to possibility.', 'Honest communication opens new doors. Speak your truth with kindness.'],
    capricorn: ['Commitment deepens today. Your responsible nature builds lasting foundations of love.', 'Patience in love pays off. Trust the slow and steady path to lasting connection.', 'Show your love through reliable actions. Consistency is your romantic superpower.'],
    aquarius: ['Unique expressions of love bring joy. Don\'t be afraid to be unconventional.', 'Intellectual connection deepens. Engage your partner in meaningful conversation.', 'Freedom and love coexist beautifully. Honor both independence and togetherness.'],
    pisces: ['Romantic dreams flow through you. Let your imagination guide your expressions of love.', 'Compassion heals old wounds. Extend understanding to yourself and your partner.', 'Spiritual connection deepens. Trust the intuitive bond you share.'],
  },
  career: {
    aries: ['Take bold action on your ambitions. Your leadership is needed today.', 'A competitive edge serves you well. Channel your energy into productive channels.', 'Initiate the project you\'ve been dreaming of. Now is the time to start.'],
    taurus: ['Steady progress builds lasting success. Keep working with patience and determination.', 'Your practical skills are in demand. Offer your expertise with confidence.', 'Financial stability is within reach. Stick to your well-laid plans.'],
    gemini: ['Your adaptable mind solves complex problems today. Share your innovative ideas.', 'Networking brings opportunities. Engage in conversations with curiosity.', 'A new skill you learn now will pay dividends. Invest in your knowledge.'],
    cancer: ['Intuitive decision-making guides your career. Trust your gut about a professional matter.', 'Nurture your professional relationships. A supportive network is your foundation.', 'Creating emotional safety at work boosts your productivity.'],
    leo: ['Your natural charisma opens doors. Step into the spotlight with confidence.', 'Creative leadership is called for. Inspire your team with vision and warmth.', 'Recognition comes for your efforts. Accept praise graciously.'],
    virgo: ['Attention to detail is your superpower. Double-check your work for excellence.', 'Organization brings clarity. Tackle the messiest part of your workload first.', 'Service to others through your work brings deep satisfaction.'],
    libra: ['Collaboration leads to breakthroughs. Seek partnership on a challenging project.', 'Diplomacy resolves a workplace tension. Your balanced perspective is valuable.', 'Aesthetic sense enhances your work. Bring beauty to your professional environment.'],
    scorpio: ['Intense focus leads to powerful results. Dive deep into your most important task.', 'Transformation in your career is brewing. Embrace the changes with courage.', 'Research uncovers valuable information. Dig beneath the surface.'],
    sagittarius: ['Expansion beckons. Explore new opportunities for growth and learning.', 'Optimism attracts professional opportunities. Share your vision with enthusiasm.', 'Teaching or mentoring brings fulfillment. Share your knowledge freely.'],
    capricorn: ['Discipline leads to achievement. Stay focused on your long-term goals.', 'Responsibility pays off. Take ownership of a key project with confidence.', 'Structure and planning create success. Map out your next quarter with care.'],
    aquarius: ['Innovation is your calling. Bring your unique perspective to a group project.', 'Technology or social change features in your work. Embrace forward-thinking solutions.', 'Your unconventional approach is exactly what\'s needed. Trust your originality.'],
    pisces: ['Creative inspiration flows. Channel your artistic energy into your work.', 'Compassion in the workplace builds bridges. Offer understanding to a colleague.', 'Trust your intuition about a career decision. The answer lies within.'],
  },
  health: {
    aries: ['High energy today. Channel it into vigorous exercise and physical challenges.', 'Your body needs action. Don\'t let restlessness turn into burnout.', 'Competitive sports energize you. Play hard, recover well.'],
    taurus: ['Consistency in your wellness routine pays off. Stick with what works.', 'Indulge your senses with nourishing foods that also taste good.', 'Gentle movement in nature soothes your soul. A long walk works wonders.'],
    gemini: ['Variety in exercise keeps you engaged. Try something new and fun.', 'Mental health matters today. Give your busy mind rest through meditation.', 'Deep breathing calms your nervous system. Take five minutes for conscious breath.'],
    cancer: ['Emotional well-being is connected to physical health. Honor your feelings with gentle care.', 'Nurturing foods support your body. Cook something comforting and healthy.', 'Water-based activities soothe your spirit. Swim or soak in peace.'],
    leo: ['Your heart needs joyful movement. Dance, run, or play with abandon.', 'Self-care is not selfish. Make time for activities that make you feel magnificent.', 'Express yourself creatively for emotional balance.'],
    virgo: ['Pay attention to the details of your health. Small adjustments create big improvements.', 'Routine supports your well-being. Establish consistent sleep and meal times.', 'Detoxifying practices benefit you. Hydrate well and eat clean.'],
    libra: ['Balance is key in all things. Avoid extremes in diet and exercise.', 'Harmony in your environment supports healing. Declutter your space for peace of mind.', 'Partner workouts bring joy. Exercise with a friend for motivation.'],
    scorpio: ['Deep transformation is possible. Commit to a health goal with intensity.', 'Investigate underlying health patterns. Knowledge empowers your healing journey.', 'Emotional release supports physical health. Let go of what weighs you down.'],
    sagittarius: ['Outdoor activities energize your spirit. Take your workout into nature.', 'Optimism boosts your immune system. Cultivate positive thoughts for better health.', 'Trying a new wellness practice expands your horizons.'],
    capricorn: ['Structure in your health routine builds lasting results. Be disciplined with your habits.', 'Bone and joint health deserve attention. Strengthen your foundation with weight-bearing exercise.', 'Long-term health investments pay off. Think about your future self.'],
    aquarius: ['Innovative approaches to wellness excite you. Explore holistic or technology-assisted health.', 'Community health matters. Join a group fitness class or wellness circle.', 'Your unique body needs a unique approach. Honor what works for you.'],
    pisces: ['Gentle, flowing movement connects body and spirit. Try yoga or tai chi.', 'Rest is healing. Allow yourself deep, restorative sleep.', 'Music and art therapy support your well-being. Nourish your creative soul.'],
  },
}

export function getHoroscope(sign: string, category: string, seed: string): string {
  const pool = texts[category]?.[sign]
  if (!pool || pool.length === 0) return 'The stars are quiet today. Trust your intuition.'
  const rng = mulberry32(seed.length + sign.length + category.length)
  const index = Math.floor(rng() * pool.length)
  return pool[index]
}
