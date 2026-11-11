const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db, initDb } = require('./db');

async function seed() {
  console.log('Initializing database schema for seed...');
  await initDb();
  console.log('Seeding Indigo literary database...');

  // Clean existing data for clean re-seed
  db.exec(`
    DELETE FROM appeals;
    DELETE FROM reports;
    DELETE FROM notifications;
    DELETE FROM reading_events;
    DELETE FROM comments;
    DELETE FROM ratings;
    DELETE FROM library;
    DELETE FROM reading_progress;
    DELETE FROM chapters;
    DELETE FROM works;
    DELETE FROM pen_names;
    DELETE FROM users;
  `);

  const now = new Date();

  function daysAgo(d) {
    const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    return date.toISOString();
  }

  function hoursAgo(h) {
    const date = new Date(now.getTime() - h * 60 * 60 * 1000);
    return date.toISOString();
  }

  const passwordHash = bcrypt.hashSync('Password123!', 10);
  const adminPasswordHash = bcrypt.hashSync('AdminPass123!', 10);

  // 1. Create Users
  const adminUser = {
    id: uuidv4(),
    username: 'admin',
    email: 'admin@indigo.lit',
    password_hash: adminPasswordHash,
    role: 'admin',
    created_at: daysAgo(60)
  };

  const userEleanor = {
    id: uuidv4(),
    username: 'eleanor_v',
    email: 'eleanor@indigo.lit',
    password_hash: passwordHash,
    role: 'user',
    created_at: daysAgo(45)
  };

  const userMarcus = {
    id: uuidv4(),
    username: 'marcus_k',
    email: 'marcus@indigo.lit',
    password_hash: passwordHash,
    role: 'user',
    created_at: daysAgo(40)
  };

  const userSophia = {
    id: uuidv4(),
    username: 'sophia_l',
    email: 'sophia@indigo.lit',
    password_hash: passwordHash,
    role: 'user',
    created_at: daysAgo(35)
  };

  const userReader = {
    id: uuidv4(),
    username: 'clara_books',
    email: 'clara@indigo.lit',
    password_hash: passwordHash,
    role: 'user',
    created_at: daysAgo(20)
  };

  const userReported = {
    id: uuidv4(),
    username: 'spambot_user',
    email: 'spam@unknown.test',
    password_hash: passwordHash,
    role: 'user',
    is_suspended: 0,
    created_at: daysAgo(5)
  };

  const insertUser = db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, is_suspended, created_at)
    VALUES (@id, @username, @email, @password_hash, @role, @is_suspended, @created_at)
  `);

  [
    { ...adminUser, is_suspended: 0 },
    { ...userEleanor, is_suspended: 0 },
    { ...userMarcus, is_suspended: 0 },
    { ...userSophia, is_suspended: 0 },
    { ...userReader, is_suspended: 0 },
    { ...userReported, is_suspended: 0 }
  ].forEach(u => insertUser.run(u));

  // 2. Create Pen Names (Demonstrating multiple pen names per user!)
  const penMidnightInk = {
    id: uuidv4(),
    user_id: userEleanor.id,
    name: 'MidnightInk',
    bio: 'Crafting atmospheric gothic romances, nocturnal thrillers, and psychological mysteries where memories harbor secrets.',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    created_at: daysAgo(45)
  };

  const penSilentWriter = {
    id: uuidv4(),
    user_id: userEleanor.id, // Eleanor's second pen name!
    name: 'SilentWriter',
    bio: 'Quiet observations of modern isolation, existential choices, and the unspoken weight between people.',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    created_at: daysAgo(30)
  };

  const penThePoet = {
    id: uuidv4(),
    user_id: userMarcus.id,
    name: 'The Poet',
    bio: 'Lyric verses on starlight, transient love, and the quiet architecture of yearning.',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    created_at: daysAgo(40)
  };

  const penSterling = {
    id: uuidv4(),
    user_id: userMarcus.id, // Marcus's second pen name!
    name: 'C. R. Sterling',
    bio: 'Chronicler of shattered realms, alchemy, and mythic empires.',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    created_at: daysAgo(25)
  };

  const penAuraVance = {
    id: uuidv4(),
    user_id: userSophia.id,
    name: 'Aura Vance',
    bio: 'Speculative fiction exploring humanity across quantum anomalies, relativistic voyages, and synthetic consciousness.',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    created_at: daysAgo(35)
  };

  const penClara = {
    id: uuidv4(),
    user_id: userReader.id,
    name: 'Clara Reads',
    bio: 'Avid bibliophile and literary reviewer.',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    created_at: daysAgo(20)
  };

  const insertPen = db.prepare(`
    INSERT INTO pen_names (id, user_id, name, bio, avatar_url, created_at)
    VALUES (@id, @user_id, @name, @bio, @avatar_url, @created_at)
  `);

  [penMidnightInk, penSilentWriter, penThePoet, penSterling, penAuraVance, penClara].forEach(p => insertPen.run(p));

  // 3. Create Works
  const insertWork = db.prepare(`
    INSERT INTO works (
      id, pen_name_id, title, slug, category, synopsis, cover_url,
      genres, status, is_published, reads_count, created_at, updated_at
    ) VALUES (
      @id, @pen_name_id, @title, @slug, @category, @synopsis, @cover_url,
      @genres, @status, @is_published, @reads_count, @created_at, @updated_at
    )
  `);

  const insertChapter = db.prepare(`
    INSERT INTO chapters (id, work_id, chapter_number, title, content, is_published, created_at, updated_at)
    VALUES (@id, @work_id, @chapter_number, @title, @content, @is_published, @created_at, @updated_at)
  `);

  // Work 1: The Silent Promise by MidnightInk (Short Story)
  const workSilentPromise = {
    id: uuidv4(),
    pen_name_id: penMidnightInk.id,
    title: 'The Silent Promise',
    slug: 'the-silent-promise',
    category: 'short_story',
    synopsis: 'In the wind-swept coastal town of Oakhaven, a long-buried correspondence between two estranging souls surfaces forty years after the great tempest. When Genevieve returns to settle her grandmother’s estate, she uncovers a vow sealed in wax and silence—one that demands to be fulfilled before the winter tides retreat.',
    cover_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    genres: JSON.stringify(['Romance', 'Drama', 'Historical Fiction']),
    status: 'ongoing',
    is_published: 1,
    reads_count: 12450,
    created_at: daysAgo(30),
    updated_at: hoursAgo(4)
  };
  insertWork.run(workSilentPromise);

  const spCh1 = {
    id: uuidv4(),
    work_id: workSilentPromise.id,
    chapter_number: 1,
    title: 'Chapter 1: The Anatomy of Departure',
    content: `The fog did not roll into Oakhaven; it crept in through the gaps in the floorboards like an unwanted inheritance.

Genevieve stood at the tall window of the conservatory, her fingers tracing the damp chill upon the glass. Behind her, the grandfather clock measured the afternoon with solemn pendulum strokes, unconcerned with the sixty-year silence it had kept until the keys turned in the front door that morning.

On the mahogany desk lay a bundle of letters tied with blackened ribbon. They smelled of dried lavender, salt air, and paraffin smoke. Her grandmother, Evelyn, had never spoken of Charles or the winter of 1944. Yet here his handwriting was: sharp, resolute, with ink so deeply pressed into the parchment that the words seemed gouged rather than written.

"To leave," the first letter began without greeting, "is not the opposite of staying. It is merely the decision to carry the house upon one’s back into the wilderness."

Genevieve picked up the letter. Outside, the Atlantic crashed against the jagged teeth of the headland, white foam climbing toward the rusted iron railings of the widow's walk. A shadow fell across the garden path, though no one walked there.`,
    is_published: 1,
    created_at: daysAgo(30),
    updated_at: daysAgo(30)
  };

  const spCh2 = {
    id: uuidv4(),
    work_id: workSilentPromise.id,
    chapter_number: 2,
    title: 'Chapter 2: Salt and Cedar',
    content: `The town archives smelled of vinegar and forgotten municipal disputes.

Mr. Finch, whose spectacles sat precariously upon the bridge of an aristocratic nose, slid the heavy register across the counter. "You have your grandmother's stubborn jaw, Genevieve. Though I imagine you did not come here to discuss family resemblances."

"I came to understand why her name was stricken from the parish register in November forty-four," she replied, keeping her voice even.

Finch hesitated. He reached into his pocket for a brass pocketknife, turning it end over end in his palm. "Some omissions are deliberate acts of kindness, my dear. Others are simply cowardice given the dignity of ink." He tapped the ledger. "Look at page ninety-two. The entry was not erased. It was excised with a razor."

Genevieve leaned in close. The edge where the parchment had been severed was straight as a plumb line. Whatever had been recorded had been destroyed not in anger, but with surgeon-like care.`,
    is_published: 1,
    created_at: daysAgo(20),
    updated_at: daysAgo(20)
  };

  const spCh3 = {
    id: uuidv4(),
    work_id: workSilentPromise.id,
    chapter_number: 3,
    title: 'Chapter 3: The Tide Clock',
    content: `Midnight came accompanied by squalls that rattled the Victorian eaves.

Genevieve lit the oil lamp in the library. In Evelyn’s journal, between the recipes for plum cordial and lists of garden seedlings, a single sentence repeated across three consecutive pages:

"The tide clock keeps time only for those who intend to drown."

In the cellar, mounted upon the foundation stone beneath the cellar stairs, was the bronze instrument. Unlike a sun dial or standard mantel clock, its single silver hand pointed toward high water. But as Genevieve watched, holding her breath, the hand did not move with the lunar current.

It ticked backward, one second every breath, counting down to an hour that had never arrived.`,
    is_published: 1,
    created_at: daysAgo(5),
    updated_at: daysAgo(5)
  };

  [spCh1, spCh2, spCh3].forEach(c => insertChapter.run(c));

  // Work 2: The Alchemist of Aethelgard by C. R. Sterling (Short Story)
  const workAlchemist = {
    id: uuidv4(),
    pen_name_id: penSterling.id,
    title: 'The Alchemist of Aethelgard',
    slug: 'the-alchemist-of-aethelgard',
    category: 'short_story',
    synopsis: 'In an empire powered by volatile mercurial resonances, apprentice Kaelen discovers an ancient cipher detailing the transmutation of memories into stone. When the Archons proclaim martial decree across the city tiers, Kaelen must choose between preserving his family’s forgotten lineage or burning the guild to its foundations.',
    cover_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    genres: JSON.stringify(['Fantasy', 'Adventure', 'Mystery']),
    status: 'ongoing',
    is_published: 1,
    reads_count: 8920,
    created_at: daysAgo(24),
    updated_at: hoursAgo(12)
  };
  insertWork.run(workAlchemist);

  const alCh1 = {
    id: uuidv4(),
    work_id: workAlchemist.id,
    chapter_number: 1,
    title: 'Chapter 1: The Crucible of Cinders',
    content: `Silver never lied, but lead had a habit of flattery.

Kaelen swept the iridescent residue from the slate workstation, catching the metallic flakes in a folded slip of sheepskin. Above him, the glass tubes of the distillation spire hummed with blue luminescence, pulsing in cadence with the geothermal vents two miles beneath the cathedral floor.

"If Master Vane catches you collecting the dross," warned Lyra from the furnace alcove, "he will bind your fingers in brass wire again."

"The dross contains three grains of vitriol per ounce," Kaelen answered without looking up. "He knows it. I know it. The only difference is that he pretends the furnace consumes it, while I intend to buy my sister’s freedom with what the furnace supposedly ate."

A sudden shudder rattled the heavy glassware on the shelves. Outside the high clerestory windows, the bells of the High Spire began to toll—not the solemn chime of vespers, but the sharp, rapid iron clatter of an Archon siege call.`,
    is_published: 1,
    created_at: daysAgo(24),
    updated_at: daysAgo(24)
  };

  const alCh2 = {
    id: uuidv4(),
    work_id: workAlchemist.id,
    chapter_number: 2,
    title: 'Chapter 2: The Inverted Sigil',
    content: `The lower city of Aethelgard reeked of sulfur and fried tallow.

Kaelen moved through the labyrinthine alleys of the Weaver's Ward, the leather satchel pressed tight beneath his arm. The curfew patrols wore coats of boiled leather reinforced with zinc plate, their lantern beams cutting golden swathes through the evening smog.

"Over here, boy," whispered a voice from beneath the stone archway of a dry cistern.

A hand clad in soot-stained lace caught his sleeve. An old woman with milky cataract eyes stared through him. "You carry the weight of three dead kings in that satchel, apprentice. Do not look into the mirror when the third moon rises, or the glass will remember what you forgot."`,
    is_published: 1,
    created_at: daysAgo(14),
    updated_at: daysAgo(14)
  };
  [alCh1, alCh2].forEach(c => insertChapter.run(c));

  // Work 3: Constellations of the Heart by The Poet (Poetry Collection)
  const workConstellations = {
    id: uuidv4(),
    pen_name_id: penThePoet.id,
    title: 'Constellations of the Heart',
    slug: 'constellations-of-the-heart',
    category: 'poem',
    synopsis: 'A lyrical collection tracing the geography of loss, nocturnal devotion, and the geometry of constellations remembered in sleepless rooms. Words crafted for reading beneath low light and listening under open skies.',
    cover_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    genres: JSON.stringify(['Poetry', 'Romance', 'Drama']),
    status: 'completed',
    is_published: 1,
    reads_count: 6740,
    created_at: daysAgo(28),
    updated_at: daysAgo(3)
  };
  insertWork.run(workConstellations);

  const poCh1 = {
    id: uuidv4(),
    work_id: workConstellations.id,
    chapter_number: 1,
    title: 'I. The Geometry of Starlight',
    content: `We built our cities out of fragile verbs,
and wondered why the winter brought them down.
You said the sky was merely fallen stone,
refracted through the silence of the town.

I watched your hands unfasten all the hours
we stored like dried hydrangea in a drawer;
the dust of summer gathered on the sill,
while ocean waters climbed the wooden floor.

If love is anything, it is the weight
of what remains when names are washed away:
the sudden bell, the lantern in the rain,
the quiet things we never learned to say.`,
    is_published: 1,
    created_at: daysAgo(28),
    updated_at: daysAgo(28)
  };

  const poCh2 = {
    id: uuidv4(),
    work_id: workConstellations.id,
    chapter_number: 2,
    title: 'II. Nocturne in Pale Indigo',
    content: `Come, sit beside the dark perimeter.
The world has closed its shutters for the night.
The river sings in syllables of reed,
reflecting nothing but the lantern light.

What did we leave behind in that cold room?
A cup of tea untouched, a folded page,
a promise that outlasted both our youths,
a sparrow trapped within an open cage.

Listen: the wind is turning in the pines.
It has no memory of where it blew.
And so I give the evening back its peace,
and keep this quiet indigo for you.`,
    is_published: 1,
    created_at: daysAgo(18),
    updated_at: daysAgo(18)
  };
  [poCh1, poCh2].forEach(c => insertChapter.run(c));

  // Work 4: Echoes of the Void by Aura Vance (Short Story)
  const workEchoes = {
    id: uuidv4(),
    pen_name_id: penAuraVance.id,
    title: 'Echoes of the Void',
    slug: 'echoes-of-the-void',
    category: 'short_story',
    synopsis: 'Dr. Talia Lin is stationed at the edge of the Kuiper Belt monitoring anomalous radio frequencies from deep space. When a transmission matches the exact brainwave signatures of her twin sister who vanished on an interstellar expedition twelve years earlier, scientific objectivity dissolves into an obsession across the cosmos.',
    cover_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
    genres: JSON.stringify(['Science Fiction', 'Thriller', 'Mystery']),
    status: 'ongoing',
    is_published: 1,
    reads_count: 5120,
    created_at: daysAgo(21),
    updated_at: hoursAgo(2)
  };
  insertWork.run(workEchoes);

  const ecCh1 = {
    id: uuidv4(),
    work_id: workEchoes.id,
    chapter_number: 1,
    title: 'Chapter 1: The Twelve-Second Delay',
    content: `Space is not silent. It hums with the static decay of newborn hydrogen and the low frequency drone of cooling reactors.

Talia Lin adjusted her headset. The observatory at Station Tartarus was a spinning ring of tungsten-carbide three billion kilometers from the sun. Out here, dawn was merely an exceptionally bright star that failed to cast warmth.

"Signal incoming on frequency nine-four-dash-echo," announced the autonomous interface.

Talia pressed the record latch. The spectrogram unrolled on the liquid crystal display. It was not a quasar pulse. It was not planetary radiation. It had the distinct undulating cadence of human theta rhythms.

And then, through the hiss of cosmic dust, came a breath. A human inhalation, followed by two words spoken in a voice Talia had not heard since her twentieth birthday:

"Don't answer."`,
    is_published: 1,
    created_at: daysAgo(21),
    updated_at: daysAgo(21)
  };
  insertChapter.run(ecCh1);

  // Work 5: An Afternoon in Shinjuku by SilentWriter (Short Story)
  const workShinjuku = {
    id: uuidv4(),
    pen_name_id: penSilentWriter.id,
    title: 'An Afternoon in Shinjuku',
    slug: 'an-afternoon-in-shinjuku',
    category: 'short_story',
    synopsis: 'A quiet, contemplative portrait of an aging bookseller in Tokyo during a November downpour, and the young stranger who returns a forgotten notebook filled with unwritten appointments.',
    cover_url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
    genres: JSON.stringify(['Drama', 'Non-fiction']),
    status: 'completed',
    is_published: 1,
    reads_count: 4210,
    created_at: daysAgo(16),
    updated_at: daysAgo(16)
  };
  insertWork.run(workShinjuku);

  const shCh1 = {
    id: uuidv4(),
    work_id: workShinjuku.id,
    chapter_number: 1,
    title: 'Complete Story',
    content: `The rain in Tokyo has a distinct resonance depending on the alley you inhabit.

In the alley behind the small second-hand bookstore, the water cascaded from a chipped copper awning into an earthenware basin with the slow rhythm of a metronome. Kenji wiped the glass counter with a dry flannel cloth. He was seventy-four, and the books in his shop were mostly older than him.

At three o'clock, the wind chime above the entrance sounded.

A young woman in a beige mackintosh stepped inside, shaking raindrops from an umbrella that seemed several sizes too small for the storm. She did not browse the shelves. She approached the counter directly and placed a small, moleskin journal upon the polished zelkova wood.

"I believe your father sold this forty years ago," she said softly.

Kenji looked down. On the inner cover, stamped in faded vermilion seal ink, was his father's mark: the character for "Listen."

"Where did you find it?" Kenji asked.

"In a desk in Kyoto," she replied, looking out into the silver deluge. "Every page is empty, except for today's date."`,
    is_published: 1,
    created_at: daysAgo(16),
    updated_at: daysAgo(16)
  };
  insertChapter.run(shCh1);

  // Work 6: Shadows Over Blackwood Hall by MidnightInk (Short Story)
  const workBlackwood = {
    id: uuidv4(),
    pen_name_id: penMidnightInk.id,
    title: 'Shadows Over Blackwood Hall',
    slug: 'shadows-over-blackwood-hall',
    category: 'short_story',
    synopsis: 'A Victorian gothic mystery set in Yorkshire moorlands. An art restorer uncovers hidden layers beneath a family portrait that depict scenes of crimes before they occurred.',
    cover_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    genres: JSON.stringify(['Mystery', 'Horror', 'Historical Fiction']),
    status: 'completed',
    is_published: 1,
    reads_count: 7320,
    created_at: daysAgo(29),
    updated_at: daysAgo(2)
  };
  insertWork.run(workBlackwood);

  const bwCh1 = {
    id: uuidv4(),
    work_id: workBlackwood.id,
    chapter_number: 1,
    title: 'Chapter 1: The Pigment of Secrets',
    content: `Prussian blue was invented by accident in Berlin, but in Blackwood Hall, it was used to conceal a burial.

Julian dipped his badger-hair brush into turpentine. The varnish on Lord Julian Blackwood's 1872 portrait had yellowed to the hue of dried honey. With circular, reverent motions, he swabbed the layer away.

Beneath the brushstroke of the aristocrat’s velvet mantle, an unexpected contour emerged. A second hand, slender and tipped with silver rings, clawed upward toward the sitter's throat from the dark background.

"Fascinating," murmured Lady Beatrice from the doorway. She had approached so quietly across the Aubusson carpet that not a single floorboard had groaned. "My great-grandfather always insisted the artist had gone mad during the sitting. Perhaps he was simply an eyewitness."`,
    is_published: 1,
    created_at: daysAgo(29),
    updated_at: daysAgo(29)
  };
  insertChapter.run(bwCh1);

  // Work 7: On Kafka's Axe (Thought / Quote Breakdown)
  const workKafkaAxe = {
    id: uuidv4(),
    pen_name_id: penSilentWriter.id,
    title: "On Kafka's Axe: Why We Need Literature That Wounds",
    slug: 'on-kafkas-axe',
    category: 'thought',
    synopsis: "A breakdown of Franz Kafka's famous 1904 letter to Oskar Pollak: 'A book must be the axe for the frozen sea within us.' A reflection on why comfortable art fails us, and why the most enduring sentences hurt before they heal.",
    cover_url: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80',
    genres: JSON.stringify(['Non-fiction', 'Drama']),
    status: 'completed',
    is_published: 1,
    reads_count: 5380,
    created_at: daysAgo(10),
    updated_at: daysAgo(1)
  };
  insertWork.run(workKafkaAxe);

  const kfCh1 = {
    id: uuidv4(),
    work_id: workKafkaAxe.id,
    chapter_number: 1,
    title: 'The Frozen Sea Within Us',
    content: `### The Quote

> "I think we ought to read only the kind of books that wound or stab us. If the book we are reading doesn't wake us up with a blow to the head, what are we reading it for? So that it will make us happy, as you write? Good Lord, we would be happy precisely if we had no books, and the kind of books that make us happy are the kind we could write ourselves if we had to. But we need the books that affect us like a disaster, that grieve us deeply, like the death of someone we loved more than ourselves, like being banished into forests far from everyone, like a suicide. A book must be the axe for the frozen sea within us."
> — **Franz Kafka**, *Letter to Oskar Pollak (January 1904)*

---

### What I Think About This

I first read this sentence at twenty, sitting in a draughty railway carriage heading north. At the time, I underlined it in dark black ink because it sounded ferocious and uncompromising—the kind of romantic nihilism that young readers wear like a dark woolen coat.

Now, years later, I return to it with a completely different kind of reverence.

Kafka is not asking for cruelty; he is asking for **awakening**.

Most of our modern days are spent in self-anesthesia. We scroll, we consume pleasant diversions, we curate polite interactions that never disturb our equilibrium. Without noticing, a crust of ice forms over our inner life. We become reasonable, pragmatic, and emotionally numb.

When a writer like Baldwin, Woolf, or Morrison strikes that ice, the sensation is violent. Your chest tightens. You stare at the opposite wall for ten minutes because a string of seven words just rearranged your childhood memory.

### Why I Love It

Because it honors the reader's soul. It refuses to treat literature as entertainment or decoration. When Kafka demands an axe, he is reminding us that inside every human being is an unfathomable ocean—and the greatest tragedy is letting it freeze over in comfort.`,
    is_published: 1,
    created_at: daysAgo(10),
    updated_at: daysAgo(1)
  };
  insertChapter.run(kfCh1);

  // Work 8: The Architecture of Solitude (Thought / Quote Breakdown)
  const workRilkeSolitude = {
    id: uuidv4(),
    pen_name_id: penThePoet.id,
    title: 'The Architecture of Solitude: Notes on Rilke',
    slug: 'the-architecture-of-solitude',
    category: 'thought',
    synopsis: "Exploring Rainer Maria Rilke's definition of love: 'Love consists in this: that two solitudes protect and border and salute each other.' Why true intimacy requires safeguarding each other's wilderness rather than merging into compromise.",
    cover_url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=600&q=80',
    genres: JSON.stringify(['Poetry', 'Non-fiction']),
    status: 'completed',
    is_published: 1,
    reads_count: 3890,
    created_at: daysAgo(7),
    updated_at: daysAgo(2)
  };
  insertWork.run(workRilkeSolitude);

  const rkCh1 = {
    id: uuidv4(),
    work_id: workRilkeSolitude.id,
    chapter_number: 1,
    title: 'Two Solitudes Bordering Each Other',
    content: `### The Quote

> "For one human being to love another; that is perhaps the most difficult of all our tasks, the ultimate, the last test and proof, the work for which all other work is even preparation... Love consists in this: that two solitudes protect and border and salute each other."
> — **Rainer Maria Rilke**, *Letters to a Young Poet (1903)*

---

### Personal Reflections

Pop culture teaches us that love is fusion. Two puzzle pieces clicking together; two halves completing one whole; the dissolution of boundaries until nothing separate remains.

Rilke offers the opposite, and it is far more radical.

He describes love not as a cage or an entanglement, but as a boundary of respect. You have a wilderness inside you—your private memories, your unspoken terrors, your solitary longings. The person who loves you is not supposed to colonize that wilderness or pave roads through it.

They stand at the frontier, lift their lantern, and salute it.

### Why This Resonates With Me

In an era of relentless connectivity where we are constantly tracked, pinged, and demanded to explain ourselves, the most precious gift one writer or lover can give another is permission to remain mysterious.

When two people protect each other's solitude, they never run out of wonder.`,
    is_published: 1,
    created_at: daysAgo(7),
    updated_at: daysAgo(2)
  };
  insertChapter.run(rkCh1);

  // 4. Create Reading Events (Across today, this week, this month to populate rankings!)
  const insertEvent = db.prepare(`
    INSERT INTO reading_events (id, work_id, user_id, created_at)
    VALUES (@id, @work_id, @user_id, @created_at)
  `);

  const allWorks = [workSilentPromise, workAlchemist, workConstellations, workEchoes, workShinjuku, workBlackwood, workKafkaAxe, workRilkeSolitude];

  allWorks.forEach(w => {
    // Today's events
    for (let i = 0; i < 15; i++) {
      insertEvent.run({
        id: uuidv4(),
        work_id: w.id,
        user_id: userReader.id,
        created_at: hoursAgo(Math.floor(Math.random() * 20))
      });
    }
    // This week's events
    for (let i = 0; i < 40; i++) {
      insertEvent.run({
        id: uuidv4(),
        work_id: w.id,
        user_id: null,
        created_at: daysAgo(Math.floor(Math.random() * 6) + 1)
      });
    }
    // This month's events
    for (let i = 0; i < 60; i++) {
      insertEvent.run({
        id: uuidv4(),
        work_id: w.id,
        user_id: null,
        created_at: daysAgo(Math.floor(Math.random() * 25) + 5)
      });
    }
  });

  // 5. Create Ratings & Reviews
  const insertRating = db.prepare(`
    INSERT INTO ratings (id, user_id, work_id, rating_val, review_text, created_at)
    VALUES (@id, @user_id, @work_id, @rating_val, @review_text, @created_at)
  `);

  insertRating.run({
    id: uuidv4(),
    user_id: userReader.id,
    work_id: workSilentPromise.id,
    rating_val: 5,
    review_text: 'A haunting and exquisitely written masterpiece. MidnightInk writes prose that feels like poetry woven into prose. The atmosphere of Oakhaven stayed with me for days.',
    created_at: daysAgo(10)
  });

  insertRating.run({
    id: uuidv4(),
    user_id: userSophia.id,
    work_id: workSilentPromise.id,
    rating_val: 5,
    review_text: 'The mystery of the tide clock is utterly riveting. I listened to all three chapters via Text-to-Speech during my evening walk—truly magical.',
    created_at: daysAgo(4)
  });

  insertRating.run({
    id: uuidv4(),
    user_id: userMarcus.id,
    work_id: workSilentPromise.id,
    rating_val: 4,
    review_text: 'Magnificent pacing and evocative coastal imagery. Highly recommended to anyone who loves deep, reflective literature.',
    created_at: daysAgo(2)
  });

  insertRating.run({
    id: uuidv4(),
    user_id: userReader.id,
    work_id: workAlchemist.id,
    rating_val: 5,
    review_text: 'Sterling has crafted a world that feels dense, ancient, and alive with danger. The alchemy system is so uniquely tactile.',
    created_at: daysAgo(12)
  });

  insertRating.run({
    id: uuidv4(),
    user_id: userEleanor.id,
    work_id: workConstellations.id,
    rating_val: 5,
    review_text: 'The Poet lives up to their name. Nocturne in Pale Indigo moved me to tears. What a gift to read this freely on Indigo.',
    created_at: daysAgo(15)
  });

  // 6. Create Comments & Discussions (with Spoilers & Replies!)
  const insertComment = db.prepare(`
    INSERT INTO comments (id, user_id, work_id, chapter_id, parent_id, content, is_spoiler, created_at)
    VALUES (@id, @user_id, @work_id, @chapter_id, @parent_id, @content, @is_spoiler, @created_at)
  `);

  const rootComm1 = {
    id: uuidv4(),
    user_id: userReader.id,
    work_id: workSilentPromise.id,
    chapter_id: spCh1.id,
    parent_id: null,
    content: 'That opening line—"The fog did not roll into Oakhaven; it crept in through the gaps in the floorboards like an unwanted inheritance"—is simply stunning.',
    is_spoiler: 0,
    created_at: daysAgo(8)
  };
  insertComment.run(rootComm1);

  const replyComm1 = {
    id: uuidv4(),
    user_id: userEleanor.id,
    work_id: workSilentPromise.id,
    chapter_id: spCh1.id,
    parent_id: rootComm1.id,
    content: 'Thank you so much Clara! Oakhaven has lived in my journal for over three years, so seeing readers connect with it is deeply moving.',
    is_spoiler: 0,
    created_at: daysAgo(7)
  };
  insertComment.run(replyComm1);

  const spoilerComm = {
    id: uuidv4(),
    user_id: userSophia.id,
    work_id: workSilentPromise.id,
    chapter_id: spCh3.id,
    parent_id: null,
    content: 'When the tide clock started ticking backward, I gasped out loud! Does this mean the storm in forty-four was trapped in temporal stasis?!',
    is_spoiler: 1, // Marked as spoiler!
    created_at: daysAgo(3)
  };
  insertComment.run(spoilerComm);

  // 7. Reading Progress & Library for User Reader (Clara)
  const insertProgress = db.prepare(`
    INSERT INTO reading_progress (id, user_id, work_id, chapter_id, progress_percentage, last_paragraph_index, updated_at)
    VALUES (@id, @user_id, @work_id, @chapter_id, @progress_percentage, @last_paragraph_index, @updated_at)
  `);

  insertProgress.run({
    id: uuidv4(),
    user_id: userReader.id,
    work_id: workSilentPromise.id,
    chapter_id: spCh2.id,
    progress_percentage: 65,
    last_paragraph_index: 3,
    updated_at: hoursAgo(3)
  });

  insertProgress.run({
    id: uuidv4(),
    user_id: userReader.id,
    work_id: workAlchemist.id,
    chapter_id: alCh1.id,
    progress_percentage: 40,
    last_paragraph_index: 2,
    updated_at: daysAgo(1)
  });

  const insertLib = db.prepare(`
    INSERT INTO library (id, user_id, work_id, status, updated_at)
    VALUES (@id, @user_id, @work_id, @status, @updated_at)
  `);

  insertLib.run({
    id: uuidv4(),
    user_id: userReader.id,
    work_id: workSilentPromise.id,
    status: 'currently_reading',
    updated_at: hoursAgo(3)
  });

  insertLib.run({
    id: uuidv4(),
    user_id: userReader.id,
    work_id: workAlchemist.id,
    status: 'currently_reading',
    updated_at: daysAgo(1)
  });

  insertLib.run({
    id: uuidv4(),
    user_id: userReader.id,
    work_id: workConstellations.id,
    status: 'completed',
    updated_at: daysAgo(5)
  });

  insertLib.run({
    id: uuidv4(),
    user_id: userReader.id,
    work_id: workBlackwood.id,
    status: 'want_to_read',
    updated_at: daysAgo(2)
  });

  // 8. Notifications
  const insertNotif = db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
    VALUES (@id, @user_id, @type, @title, @message, @link, @is_read, @created_at)
  `);

  insertNotif.run({
    id: uuidv4(),
    user_id: userEleanor.id,
    type: 'new_rating',
    title: 'New Review on The Silent Promise',
    message: 'Clara Books rated your work 5 stars',
    link: `/book/${workSilentPromise.id}`,
    is_read: 0,
    created_at: daysAgo(10)
  });

  insertNotif.run({
    id: uuidv4(),
    user_id: userEleanor.id,
    type: 'new_comment',
    title: 'New Comment on The Silent Promise',
    message: 'Sophia left a comment on Chapter 3',
    link: `/book/${workSilentPromise.id}`,
    is_read: 0,
    created_at: daysAgo(3)
  });

  insertNotif.run({
    id: uuidv4(),
    user_id: userReader.id,
    type: 'chapter_published',
    title: 'New Chapter: The Silent Promise',
    message: 'MidnightInk published Chapter 3: The Tide Clock',
    link: `/read/${workSilentPromise.id}/${spCh3.id}`,
    is_read: 0,
    created_at: daysAgo(5)
  });

  // 9. Moderation Reports & Appeals for Admin Testing
  const insertReport = db.prepare(`
    INSERT INTO reports (id, reporter_id, target_type, target_id, reason, details, status, created_at)
    VALUES (@id, @reporter_id, @target_type, @target_id, @reason, @details, @status, @created_at)
  `);

  insertReport.run({
    id: uuidv4(),
    reporter_id: userReader.id,
    target_type: 'user',
    target_id: userReported.id,
    reason: 'Automated advertising spam',
    details: 'User account created multiple suspicious automated comments advertising external scam websites.',
    status: 'pending',
    created_at: daysAgo(1)
  });

  insertReport.run({
    id: uuidv4(),
    reporter_id: userSophia.id,
    target_type: 'work',
    target_id: workBlackwood.id,
    reason: 'Suspected plagiarism check',
    details: 'Inquiry into whether the historical excerpt in chapter one is in the public domain. Checked and confirmed historical attribution is clean.',
    status: 'resolved',
    created_at: daysAgo(10)
  });

  const insertAppeal = db.prepare(`
    INSERT INTO appeals (id, user_id, action_type, reason, status, admin_notes, created_at)
    VALUES (@id, @user_id, @action_type, @reason, @status, @admin_notes, @created_at)
  `);

  insertAppeal.run({
    id: uuidv4(),
    user_id: userReported.id,
    action_type: 'suspension',
    reason: 'I believe my IP was flagged in error during travel. I am an aspiring writer.',
    status: 'pending',
    admin_notes: '',
    created_at: hoursAgo(6)
  });

  console.log('Seeding completed successfully!');
  console.log('Credentials:');
  console.log('Admin: admin@indigo.lit / AdminPass123!');
  console.log('Writer 1 (Eleanor - MidnightInk & SilentWriter): eleanor@indigo.lit / Password123!');
  console.log('Writer 2 (Marcus - The Poet & C.R. Sterling): marcus@indigo.lit / Password123!');
  console.log('Reader (Clara): clara@indigo.lit / Password123!');
}

seed().catch(err => {
  console.error('Seed execution error:', err);
  process.exit(1);
});
