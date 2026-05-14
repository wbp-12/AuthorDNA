export type MetricCategory = {
  id: string;
  name: string;
  score: number; // 0-100, higher = closer to user's voice
  observation: string;
  subMetrics: { label: string; userValue: string; textValue: string; aligned: boolean }[];
};

export const sampleText = `It seems that the proliferation of artificial intelligence in academic writing has fundamentally transformed how scholars approach their craft. The technology has moved quickly from a distant novelty to an ordinary tool, and that shift has changed how researchers draft, revise, and evaluate their work.

The discussion is no longer only about whether AI should be used. It is about how it should be used, where its limits should be drawn, and how writers can preserve clarity, ownership, and voice while still benefiting from the speed it offers.

The rise of these systems has also altered the rhythm of scholarly composition. Writers can now generate summaries, test outlines, and compare phrasings in seconds, yet those efficiencies do not remove the need for judgment. In many cases, they make judgment more important, because the first clear answer is not always the most precise one.

Researchers across disciplines are grappling with questions of authorship, originality, and intellectual integrity in ways that were perhaps unimaginable just a decade ago. Some scholars see the tools as a practical extension of writing labor, while others worry that the convenience of automation may flatten the specificity of academic voice.

Furthermore, the integration of these tools into the writing process has perhaps blurred the boundaries between human creativity and machine assistance, raising essential questions about the future of scholarly communication. Universities, journals, and individual writers are still deciding how to define responsible use, and those decisions will shape the norms that follow.`;

export const userBaseline = {
  name: "Eleanor Vance",
  samplesAnalyzed: 47,
  wordsProfiled: 38420,
  voiceSummary: "Direct, declarative, sparing with hedges. Favors em-dashes and short paragraphs.",
};

export const metrics: MetricCategory[] = [
  {
    id: "architecture",
    name: "Sentence Flow",
    score: 78,
    observation:
      "Your sentences are typically short and direct. This paragraph has several long, complex sentences.",
    subMetrics: [
      { label: "Mean sentence length", userValue: "14 words", textValue: "31 words", aligned: false },
      { label: "Length variability (σ)", userValue: "5.2", textValue: "8.1", aligned: false },
      { label: "Simple sentence ratio", userValue: "62%", textValue: "18%", aligned: false },
      { label: "Complex sentence ratio", userValue: "21%", textValue: "64%", aligned: false },
    ],
  },
  {
    id: "word",
    name: "Word Choice",
    score: 74,
    observation:
      "You rarely use formal academic vocabulary. This passage uses several formal terms like 'proliferation,' 'unprecedented,' and 'unimaginable.'",
    subMetrics: [
      { label: "Lexical formality", userValue: "0.18", textValue: "0.41", aligned: false },
      { label: "Contraction rate", userValue: "12%", textValue: "0%", aligned: false },
      { label: "First-person density", userValue: "2.8%", textValue: "0%", aligned: false },
      { label: "Lexical diversity (MTLD)", userValue: "78", textValue: "82", aligned: true },
    ],
  },
  {
    id: "structure",
    name: "Structure",
    score: 82,
    observation:
      "You usually write short paragraphs with clear transitions. This is a single dense paragraph.",
    subMetrics: [
      { label: "Mean paragraph length", userValue: "3.1 sent.", textValue: "5 sent.", aligned: false },
      { label: "Transition density", userValue: "0.18", textValue: "0.20", aligned: true },
      { label: "Question openings", userValue: "8%", textValue: "0%", aligned: false },
    ],
  },
  {
    id: "tone",
    name: "Tone",
    score: 71,
    observation:
      "You typically write with confidence. This passage uses hedging language like 'seems,' 'perhaps,' and 'may have.'",
    subMetrics: [
      { label: "Hedge density", userValue: "0.4%", textValue: "1.9%", aligned: false },
      { label: "Emphatic density", userValue: "1.2%", textValue: "0.3%", aligned: false },
      { label: "Passive voice ratio", userValue: "9%", textValue: "24%", aligned: false },
      { label: "Certainty balance", userValue: "+0.8", textValue: "−1.6", aligned: false },
    ],
  },
  {
    id: "punctuation",
    name: "Punctuation",
    score: 86,
    observation: "You often use em-dashes for asides. This paragraph has none.",
    subMetrics: [
      { label: "Em-dash / 1k words", userValue: "8.4", textValue: "0", aligned: false },
      { label: "Semicolon / 1k words", userValue: "1.1", textValue: "0", aligned: true },
      { label: "Colon / 1k words", userValue: "2.3", textValue: "0", aligned: true },
      { label: "Question mark / 1k", userValue: "4.0", textValue: "0", aligned: false },
    ],
  },
];

export const suggestions = [
  {
    id: "s2",
    category: "Tone",
    severity: "high",
    excerpt: "It seems that the proliferation of artificial intelligence...",
    paragraphIndex: 0,
    targetText:
      "It seems that the proliferation of artificial intelligence in academic writing has fundamentally transformed how scholars approach their craft.",
    observation: "You typically write with confidence. The opener hedges with “seems,” which softens the authority of the claim.",
    tradeoff: {
      gain: "A firmer opening claim.",
      loss: "Less cautious framing.",
    },
    proposed:
      "The proliferation of artificial intelligence in academic writing has fundamentally transformed how scholars approach their craft.",
  },
  {
    id: "s3",
    category: "Word Choice",
    severity: "medium",
    excerpt: "...a practical extension of writing labor...",
    paragraphIndex: 3,
    targetText:
      "Some scholars see the tools as a practical extension of writing labor, while others worry that the convenience of automation may flatten the specificity of academic voice.",
    observation: "You typically prefer more natural and direct phrasing. “Writing labor” feels more theoretical than your normal vocabulary.",
    tradeoff: {
      gain: "More natural, everyday phrasing.",
      loss: "A bit less conceptual distance.",
    },
    proposed: "...a practical extension of the writing process...",
  },
  {
    id: "s4",
    category: "Sentence Flow",
    severity: "high",
    excerpt:
      "...and compare phrasings in seconds, yet those efficiencies do not remove the need for judgment.",
    paragraphIndex: 2,
    targetText:
      "Writers can now generate summaries, test outlines, and compare phrasings in seconds, yet those efficiencies do not remove the need for judgment.",
    observation:
      "You usually give contrasting ideas more separation. Here, the sentence moves too quickly without a pause between the two ideas.",
    tradeoff: {
      gain: "Cleaner pacing between the two ideas.",
      loss: "Less compression in the original sentence.",
    },
    proposed:
      "Writers can now generate summaries, test outlines, and compare phrasings in seconds. Yet, those efficiencies do not remove the need for judgment.",
  },
  {
    id: "s5",
    category: "Punctuation",
    severity: "medium",
    excerpt:
      "...more important, because the first clear answer is not always the most precise one.",
    paragraphIndex: 2,
    targetText:
      "In many cases, they make judgment more important, because the first clear answer is not always the most precise one.",
    observation:
      "You usually avoid interrupting the momentum of a sentence with explanatory commas before “because.” Here, the pause slightly weakens the progression of the idea.",
    tradeoff: {
      gain: "A cleaner, more direct cadence.",
      loss: "A small amount of explanatory pause.",
    },
    proposed:
      "In many cases, they make judgment more important because the first clear answer is not always the most precise one.",
  },
  {
    id: "s6",
    category: "Sentence Flow",
    severity: "medium",
    excerpt:
      "...human creativity and machine assistance, raising essential questions about the future of scholarly communication.",
    paragraphIndex: 4,
    targetText:
      "Furthermore, the integration of these tools into the writing process has perhaps blurred the boundaries between human creativity and machine assistance, raising essential questions about the future of scholarly communication.",
    observation:
      "You typically separate major consequences into a new sentence rather than attaching them after a comma. Here, the final idea feels appended instead of emphasized.",
    tradeoff: {
      gain: "Stronger separation between the core claim and the consequence.",
      loss: "A slightly less continuous sentence.",
    },
    proposed:
      "These tools have blurred the boundaries between human creativity and machine assistance. That shift raises essential questions about the future of scholarly communication.",
  },
  {
    id: "s1",
    category: "Structure",
    severity: "high",
    excerpt: "The discussion is no longer only about whether AI should be used...",
    paragraphIndex: 1,
    targetText:
      "The discussion is no longer only about whether AI should be used. It is about how it should be used, where its limits should be drawn, and how writers can preserve clarity, ownership, and voice while still benefiting from the speed it offers.",
    observation:
      "You usually develop supporting ideas before arriving at the final takeaway. Here, the piece introduces a conclusion-like paragraph before the earlier points have been fully established.",
    tradeoff: {
      gain: "A conclusion that follows the supporting arguments.",
      loss: "Slightly less front-loaded emphasis.",
    },
    proposed:
      "Move the paragraph beginning with “The discussion is no longer only about whether AI should be used...” to the end of the piece so the conclusion follows the supporting arguments rather than appearing before them.",
  },
];
