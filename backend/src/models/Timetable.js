import mongoose from 'mongoose';

export const defaultDays = [
  { day: 'Mon', morning: 'DSA + Java/SQL (2-3h)', afternoon: '—', evening: 'Web dev / project' },
  { day: 'Tue', morning: 'DSA + Java/SQL (2-3h)', afternoon: '—', evening: 'Reading (45-60 min)' },
  { day: 'Wed', morning: 'DSA + Java/SQL (2-3h)', afternoon: '—', evening: 'Web dev / project' },
  { day: 'Thu', morning: 'DSA + Java/SQL (2-3h)', afternoon: '—', evening: 'Reading (45-60 min)' },
  { day: 'Fri', morning: 'DSA + Java/SQL (2-3h)', afternoon: '—', evening: 'Content research (15-20 min, just consuming refs)' },
  { day: 'Sat', morning: "Script/plan from the week's research", afternoon: 'Record', evening: 'Reading (45-60 min)' },
  { day: 'Sun', morning: 'Edit', afternoon: 'Hobby (writing / drawing / animation — pick ONE)', evening: 'Free / slack' },
];

export const defaultNotes = [
  "Research moved to Friday evening, light-touch — no pressure to produce, just gather",
  "Saturday morning is now just organizing what you already researched into a script, not starting research cold",
  "Sunday evening is now genuinely open — your slack buffer for the week. If nothing went wrong, use it for whatever; if something did, this is where it absorbs the hit instead of the whole system collapsing"
];

export const defaultRule = 'If you miss a weekday DSA block, don\'t try to "make it up" — just resume tomorrow. Systems die from guilt-driven catch-up more than from the miss itself.';

const daySlotSchema = new mongoose.Schema({
  day: { type: String, required: true },
  morning: { type: String, default: '—' },
  afternoon: { type: String, default: '—' },
  evening: { type: String, default: '—' },
}, { _id: false });

const timetableSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  schedule: {
    type: [daySlotSchema],
    default: () => defaultDays,
  },
  notes: {
    type: [String],
    default: () => defaultNotes,
  },
  goldenRule: {
    type: String,
    default: defaultRule,
  },
}, {
  timestamps: true,
});

export default mongoose.model('Timetable', timetableSchema);
