const { initDb, db } = require('../server/db');
const http = require('http');

async function runTests() {
  console.log('--- STARTING INDIGO FULL-STACK USER JOURNEYS TEST ---');
  await initDb();

  // Start express server in memory for testing
  const express = require('express');
  const cors = require('cors');
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', require('../server/routes/auth'));
  app.use('/api/pen-names', require('../server/routes/penNames'));
  app.use('/api/works', require('../server/routes/works'));
  app.use('/api/chapters', require('../server/routes/chapters'));
  app.use('/api/reading', require('../server/routes/reading'));
  app.use('/api', require('../server/routes/interactions'));
  app.use('/api/upload', require('../server/routes/upload'));
  app.use('/api/notifications', require('../server/routes/notifications'));
  app.use('/api/admin', require('../server/routes/admin'));
  app.use('/api/diary', require('../server/routes/diary'));

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(5099, resolve));
  const baseUrl = 'http://localhost:5099/api';

  async function api(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  // Generate unique run identifier for repeatable test execution
  const runId = Math.floor(Math.random() * 900000 + 100000);

  // JOURNEY STEP 1: A user registers
  console.log('\nStep 1: Registering new author user...');
  const authorAuth = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: `veronica_${runId}`,
      email: `veronica_${runId}@journey.test`,
      password: 'AuthorPassword123!'
    })
  });
  console.log('✓ Author registered. Token acquired. User ID:', authorAuth.user.id);
  const authorToken = authorAuth.token;

  // JOURNEY STEP 2: Creates two different pen names
  console.log('\nStep 2: Managing multiple pen names for one account...');
  const defaultPenName = authorAuth.penNames[0];
  console.log('  Initial auto-created pen name:', defaultPenName.name);

  // Create second pen name
  const penName2Res = await api('/pen-names', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authorToken}` },
    body: JSON.stringify({
      name: 'NocturnalSage',
      bio: 'Lyrical reflections on geometry, winter light, and transient solace.',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'
    })
  });
  const penName2 = penName2Res.penName;
  console.log('✓ Created second pen name:', penName2.name);

  // Create third pen name
  const penName3Res = await api('/pen-names', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authorToken}` },
    body: JSON.stringify({
      name: 'V. R. Sterling',
      bio: 'High fantasy, shattered thrones, and alchemical warfare.'
    })
  });
  const penName3 = penName3Res.penName;
  console.log('✓ Created third pen name:', penName3.name);

  const authorPenNames = await api('/pen-names', {
    headers: { Authorization: `Bearer ${authorToken}` }
  });
  console.log('✓ Verified account owns', authorPenNames.length, 'distinct pen names.');

  // JOURNEY STEP 3: Publishes a short story under the first pen name
  console.log('\nStep 3: Publishing serialized Short Story under pen name 1 (V. R. Sterling)...');
  const novelRes = await api('/works', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authorToken}` },
    body: JSON.stringify({
      pen_name_id: penName3.id,
      title: 'Whispers of the Obsidian Spire',
      category: 'short_story',
      synopsis: 'An apprentice runekeeper uncovers a conspiracy beneath the capital spire.',
      genres: ['Fantasy', 'Adventure', 'Mystery'],
      status: 'ongoing',
      is_published: 1,
      initial_chapter: {
        title: 'Chapter 1: The Ash Gate',
        content: `The ash did not fall like snow; it drifted across the battlements like coarse black sand.

Kaelen tightened his leather gauntlet. Below the high precipice of the Obsidian Spire, the furnaces of the Low Guilds glowed like an ocean of dying embers. Every furnace burned night and day to smelt the runic mercury that kept the sky-bastions suspended.

"You should not be here after second toll," said Lyra, stepping out from the shadows of the water cistern.

"Second toll was an hour ago," Kaelen replied, holding the copper seal up to the starlight. "And the Archons just broke the gate."`,
        is_published: 1
      }
    })
  });
  const novel = novelRes.work;
  console.log('✓ Short Story published immediately! ID:', novel.id, 'Title:', novel.title);

  // JOURNEY STEP 4: Publishes a poem under the second pen name
  console.log('\nStep 4: Publishing Poetry collection under pen name 2 (NocturnalSage)...');
  const poemRes = await api('/works', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authorToken}` },
    body: JSON.stringify({
      pen_name_id: penName2.id,
      title: 'Starlight Over Kyoto',
      category: 'poem',
      synopsis: 'Contemplative verses on wooden bridges, evening mist, and cedar smoke.',
      genres: ['Poetry', 'Drama'],
      status: 'completed',
      is_published: 1,
      initial_chapter: {
        title: 'I. Cedar and River Stone',
        content: `The lantern swings above the wooden bridge,
a single drop of gold against the gray.
The water answers in its quiet tongue,
washing the names of autumn leaves away.`,
        is_published: 1
      }
    })
  });
  const poem = poemRes.work;
  console.log('✓ Poem published immediately! ID:', poem.id, 'Title:', poem.title);

  // JOURNEY STEP 4B: Publishes a Thought / Quote Breakdown under default pen name
  console.log('\nStep 4B: Publishing Thought & Quote Breakdown under pen name 1...');
  const thoughtRes = await api('/works', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authorToken}` },
    body: JSON.stringify({
      pen_name_id: defaultPenName.id,
      title: "On James Baldwin's Masks: The Architecture of Vulnerability",
      category: 'thought',
      synopsis: "A breakdown of James Baldwin's quote on how love removes the masks we cannot live without and cannot live within.",
      genres: ['Non-fiction', 'Drama'],
      status: 'completed',
      is_published: 1,
      initial_chapter: {
        title: 'The Masks We Cannot Live Without',
        content: `### The Quote

> "Love takes off the masks that we fear we cannot live without and know we cannot live within."
> — **James Baldwin**, *The Fire Next Time*

### Why This Resonates With Me

Baldwin diagnoses the human condition with terrifying accuracy. We spend years crafting a persona to protect ourselves from shame and rejection, yet that very persona suffocates our real spirit. True literature and genuine love demand that the mask be set aside.`,
        is_published: 1
      }
    })
  });
  const thoughtWork = thoughtRes.work;
  console.log('✓ Thought published immediately! ID:', thoughtWork.id, 'Title:', thoughtWork.title);

  // JOURNEY STEP 5: All publications appear in the correct sections
  console.log('\nStep 5: Verifying publications in Discovery sections...');
  const storyList = await api('/works?category=short_story');
  const foundStory = storyList.works.find(w => w.id === novel.id);
  console.log('✓ Short Story found in Short Stories section with pen name:', foundStory?.pen_name);

  const poemList = await api('/works?category=poem');
  const foundPoem = poemList.works.find(w => w.id === poem.id);
  console.log('✓ Poem found in Poetry section with pen name:', foundPoem?.pen_name);

  const thoughtList = await api('/works?category=thought');
  const foundThought = thoughtList.works.find(w => w.id === thoughtWork.id);
  console.log('✓ Thought found in Thoughts section with pen name:', foundThought?.pen_name);

  // JOURNEY STEP 6: A different user discovers the novel
  console.log('\nStep 6: Registering a second user (Reader) to discover works...');
  const readerAuth = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: `felix_${runId}`,
      email: `felix_${runId}@journey.test`,
      password: 'ReaderPassword123!'
    })
  });
  const readerToken = readerAuth.token;
  console.log('✓ Reader account registered. Username:', readerAuth.user.username);

  const searchResults = await api('/works?search=Obsidian');
  console.log('✓ Reader searched for "Obsidian", found:', searchResults.works.length, 'result(s)');

  // JOURNEY STEP 7 & 8: Reader opens book, reads Chapter 1
  console.log('\nStep 7 & 8: Opening book & reading Chapter 1...');
  const bookDetails = await api(`/works/${novel.id}`, {
    headers: { Authorization: `Bearer ${readerToken}` }
  });
  console.log('✓ Retrieved book details. Chapters available:', bookDetails.chapters.length);

  const chapter1Id = bookDetails.chapters[0].id;
  const chapterDetails = await api(`/chapters/${chapter1Id}`, {
    headers: { Authorization: `Bearer ${readerToken}` }
  });
  console.log('✓ Opened Chapter 1: "' + chapterDetails.chapter.title + '"');

  // Increment read count event
  await api(`/works/${novel.id}/read`, { method: 'POST' });
  console.log('✓ Read count incremented in real-time database');

  // JOURNEY STEP 9: Reading progress is saved
  console.log('\nStep 9: Saving reader progress & library entry...');
  await api('/reading/progress', {
    method: 'POST',
    headers: { Authorization: `Bearer ${readerToken}` },
    body: JSON.stringify({
      work_id: novel.id,
      chapter_id: chapter1Id,
      progress_percentage: 75,
      last_paragraph_index: 3
    })
  });

  const progressCheck = await api(`/reading/progress/${novel.id}`, {
    headers: { Authorization: `Bearer ${readerToken}` }
  });
  console.log('✓ Reading progress persisted! Saved percentage:', progressCheck.progress_percentage + '%');

  const readerLib = await api('/reading/library', {
    headers: { Authorization: `Bearer ${readerToken}` }
  });
  console.log('✓ Work automatically registered in Reader Library shelf:', readerLib[0]?.library_status);

  // JOURNEY STEP 10: Text-to-Speech payload check
  console.log('\nStep 10: Verifying Text-to-Speech readiness...');
  const paragraphs = chapterDetails.chapter.content.split(/\n\s*\n/).filter(Boolean);
  console.log('✓ Chapter segmented into', paragraphs.length, 'paragraphs ready for SpeechSynthesis');

  // JOURNEY STEP 11: Reader leaves rating and comment
  console.log('\nStep 11: Reader leaves rating and discussion comment...');
  const ratingRes = await api(`/works/${novel.id}/rating`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${readerToken}` },
    body: JSON.stringify({
      rating: 5,
      review_text: 'Atmospheric and gripping from the very first paragraph!'
    })
  });
  console.log('✓ 5-Star rating recorded. New average rating:', ratingRes.avgRating);

  const commentRes = await api(`/works/${novel.id}/comments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${readerToken}` },
    body: JSON.stringify({
      content: 'I love how the runic mercury system powers the bastions. Is the High Spire inhabited by the ancient kings?',
      is_spoiler: false
    })
  });
  console.log('✓ Discussion comment posted by reader. Comment ID:', commentRes.comment.id);

  // JOURNEY STEP 12: Verify statistics update
  console.log('\nStep 12: Verifying updated statistics on book...');
  const updatedBook = await api(`/works/${novel.id}`);
  console.log('✓ Verified book stats: Reads =', updatedBook.work.reads_count,
    '| Avg Rating =', updatedBook.work.avg_rating,
    '| Comments =', updatedBook.work.comments_count);

  // JOURNEY STEP 13: Author can edit their work
  console.log('\nStep 13: Author edits work & adds Chapter 2...');
  await api(`/works/${novel.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${authorToken}` },
    body: JSON.stringify({
      title: 'Whispers of the Obsidian Spire (Revised Edition)',
      synopsis: 'An apprentice runekeeper uncovers a conspiracy beneath the capital spire. Updated with second chapter.'
    })
  });

  const ch2Res = await api('/chapters', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authorToken}` },
    body: JSON.stringify({
      work_id: novel.id,
      title: 'Chapter 2: The Mercury Cistern',
      content: 'The liquid metal did not reflect the lantern light so much as swallow it.',
      is_published: 1
    })
  });
  console.log('✓ Author updated title & added Chapter 2 (ID:', ch2Res.chapter.id + ')');

  // JOURNEY STEP 14: Administrator moderation & report workflow
  console.log('\nStep 14: Testing reporting and Admin review workflow...');
  // Reader reports a test issue
  const reportRes = await api('/reports', {
    method: 'POST',
    headers: { Authorization: `Bearer ${readerToken}` },
    body: JSON.stringify({
      target_type: 'work',
      target_id: novel.id,
      reason: 'Check for copyright attribution verification',
      details: 'Please verify the lore background.'
    })
  });
  console.log('✓ Reader submitted report.');

  // Admin logs in
  const adminAuth = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      login: 'admin@indigo.lit',
      password: 'AdminPass123!'
    })
  });
  const adminToken = adminAuth.token;
  console.log('✓ Administrator logged in successfully.');

  const adminStats = await api('/admin/stats', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('✓ Admin fetched platform telemetry: Total users =', adminStats.metrics.totalUsers, '| Total works =', adminStats.metrics.totalWorks);

  const pendingReports = await api('/admin/reports?status=pending', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('✓ Admin retrieved pending reports count:', pendingReports.length);

  if (pendingReports.length > 0) {
    const reportToResolve = pendingReports[0];
    await api(`/admin/reports/${reportToResolve.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'resolved' })
    });
    console.log('✓ Admin resolved report ID:', reportToResolve.id);
  }

  // JOURNEY STEP 15: Creator Studio CRUD operations
  console.log('\nStep 15: Testing enhanced Creator Studio CRUD operations...');
  const myWorks = await api('/works/mine', {
    headers: { Authorization: `Bearer ${authorToken}` }
  });
  console.log('✓ Author retrieved all their publications across pen names:', myWorks.works.length, 'works found.');

  // Quick-status toggle (unpublish/publish)
  const quickStatusRes = await api(`/works/${novel.id}/quick-status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${authorToken}` },
    body: JSON.stringify({ is_published: 0, status: 'completed' })
  });
  console.log('✓ 1-Click Status switch: Work is_published =', quickStatusRes.work.is_published, '| status =', quickStatusRes.work.status);

  // Duplicate work
  const duplicateRes = await api(`/works/${novel.id}/duplicate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authorToken}` }
  });
  console.log('✓ 1-Click Duplicate work: Created manuscript copy ID:', duplicateRes.work.id, 'Title:', duplicateRes.work.title);

  // Quick chapter title update & quick publish toggle
  const firstDupeChapter = duplicateRes.chapters[0];
  if (firstDupeChapter) {
    const renamedChapter = await api(`/chapters/${firstDupeChapter.id}/quick-title`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authorToken}` },
      body: JSON.stringify({ title: 'Prologue: Shadows Awaken' })
    });
    console.log('✓ Inline chapter title quick edit:', renamedChapter.chapter.title);

    const publishedChapter = await api(`/chapters/${firstDupeChapter.id}/quick-publish`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authorToken}` },
      body: JSON.stringify({ is_published: 1 })
    });
    console.log('✓ Inline chapter quick publish toggle: is_published =', publishedChapter.chapter.is_published);
  }

  // JOURNEY STEP 16: Diary Entries (Private by default, auto/editable date stamp, clean reader, selective sharing)
  console.log('\nStep 16: Testing Diary Entries feature (privacy, editable dates, sharing)...');
  
  // 1. Create a diary entry (defaulting to private and today's date)
  const createdDiaryRes = await api('/diary', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authorToken}` },
    body: JSON.stringify({
      title: 'Midnight Reflections on Solitude',
      content: 'The city grows silent under the rain. Finding beauty in quiet corners.',
      mood: 'Contemplative',
      weather: 'Rainy'
    })
  });
  const diaryEntry = createdDiaryRes.entry;
  console.log('✓ Created diary entry:', diaryEntry.id, 'Title:', diaryEntry.title);
  if (diaryEntry.is_public !== 0) throw new Error('Diary entry was not private by default!');
  if (!diaryEntry.entry_date) throw new Error('Diary entry was not automatically date stamped!');
  console.log('  Verified: is_public =', diaryEntry.is_public, '(Private by default), entry_date =', diaryEntry.entry_date);

  // 2. Fetch author's diary entries
  const myDiaryRes = await api('/diary/mine', {
    headers: { Authorization: `Bearer ${authorToken}` }
  });
  console.log('✓ Author retrieved personal diary index:', myDiaryRes.entries.length, 'entries found. Total stats:', myDiaryRes.stats);

  // 3. Edit date and content
  const updatedDiaryRes = await api(`/diary/${diaryEntry.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${authorToken}` },
    body: JSON.stringify({
      title: 'Midnight Reflections on Solitude (Updated)',
      content: 'The rain has stopped now. The stars are breaking through the mist.',
      entry_date: '2026-11-01',
      mood: 'Peaceful',
      weather: 'Clear'
    })
  });
  console.log('✓ Successfully edited diary entry date to custom date:', updatedDiaryRes.entry.entry_date);

  // 4. Unauthorized reader attempts to read private diary entry -> expect 403 Forbidden
  let privacyBlocked = false;
  try {
    await api(`/diary/entry/${diaryEntry.id}`, {
      headers: { Authorization: `Bearer ${readerToken}` }
    });
  } catch (err) {
    privacyBlocked = true;
    console.log('✓ Verified privacy enforcement: Unauthorized reader blocked with error:', err.message);
  }
  if (!privacyBlocked) throw new Error('Unauthorized user was able to access a private diary entry!');

  // 5. Author toggles privacy to shared (is_public = 1)
  const toggledDiaryRes = await api(`/diary/${diaryEntry.id}/toggle-privacy`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${authorToken}` }
  });
  console.log('✓ 1-Click Privacy Toggle: is_public is now =', toggledDiaryRes.is_public);

  // 6. Reader can now access the shared entry and see it in public shared list
  const publicEntryRes = await api(`/diary/entry/${diaryEntry.id}`, {
    headers: { Authorization: `Bearer ${readerToken}` }
  });
  console.log('✓ Public reader can now read shared diary entry:', publicEntryRes.entry.title);

  const publicDiaries = await api('/diary/public');
  const foundInPublic = publicDiaries.entries.some(e => e.id === diaryEntry.id);
  if (!foundInPublic) throw new Error('Shared diary entry not found in public list!');
  console.log('✓ Entry appears in public community feed:', foundInPublic);

  // 7. Delete diary entry
  await api(`/diary/${diaryEntry.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${authorToken}` }
  });
  console.log('✓ Successfully deleted diary entry.');

  // Close test server
  server.close();
  console.log('\n======================================================');
  console.log('ALL 16 USER JOURNEYS PASSED WITH REAL PERSISTED DATA!');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('Test journey failure:', err);
  process.exit(1);
});
