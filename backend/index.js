require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const { PrismaClient } = require('./generated/prisma');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 4000;

const prisma = new PrismaClient();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// Set up multer for file uploads
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage });

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await prisma.user.findUnique({ where: { googleId: profile.id } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
        },
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

app.get('/', (req, res) => {
  res.send('Ultrafantasi backend is running!');
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect or respond
    res.redirect('http://localhost:5173');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.send({ success: true });
  });
});

app.get('/auth/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.send(req.user);
  } else {
    res.status(401).send({ error: 'Not authenticated' });
  }
});

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

// Middleware to check admin
function isAdmin(req, res, next) {
  if (req.user && req.user.email === 'eplehans@gmail.com') return next();
  return res.status(403).json({ error: 'Admin only' });
}

// Get all runners (global)
app.get('/runners', async (req, res) => {
  try {
    const runners = await prisma.runner.findMany();
    res.json(runners);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch runners' });
  }
});

// Add runners to a race (with global runner merge)
app.post('/races/:raceId/runners', async (req, res) => {
  const { raceId } = req.params;
  let runners = req.body;
  if (!Array.isArray(runners)) runners = [runners];
  const createdOrLinked = [];
  for (const r of runners) {
    if (!r.firstname || !r.lastname || !r.gender || !r.distance || !r.category) {
      return res.status(400).json({ error: 'Mangler påkrevde felter for en eller flere løpere' });
    }
    // Default all metadata fields to empty string if missing
    const meta = {
      instagram: r.instagram ?? "",
      strava: r.strava ?? "",
      duv: r.duv ?? "",
      utmb: r.utmb ?? "",
      itra: r.itra ?? "",
      neda: r.neda ?? "",
    };
    // Try to find existing runner by name, gender, and optionally social links
    let existing = await prisma.runner.findFirst({
      where: {
        firstname: r.firstname,
        lastname: r.lastname,
        gender: r.gender,
      },
    });
    if (existing) {
      // Optionally update social links if new info is provided
      const updateData = {};
      if (meta.instagram && !existing.instagram) updateData.instagram = meta.instagram;
      if (meta.strava && !existing.strava) updateData.strava = meta.strava;
      if (meta.duv && !existing.duv) updateData.duv = meta.duv;
      if (meta.utmb && !existing.utmb) updateData.utmb = meta.utmb;
      if (meta.itra && !existing.itra) updateData.itra = meta.itra;
      if (meta.neda && !existing.neda) updateData.neda = meta.neda;
      if (Object.keys(updateData).length > 0) {
        existing = await prisma.runner.update({ where: { id: existing.id }, data: updateData });
      }
      // Link runner to race if not already linked
      await prisma.race.update({
        where: { id: raceId },
        data: { runners: { connect: { id: existing.id } } },
      });
      createdOrLinked.push(existing);
    } else {
      // Create new runner and link to race
      const newRunner = await prisma.runner.create({
        data: {
          firstname: r.firstname,
          lastname: r.lastname,
          gender: r.gender,
          distance: r.distance.toString(),
          category: r.category,
          ...meta,
          races: { connect: { id: raceId } },
        },
      });
      createdOrLinked.push(newRunner);
    }
  }
  res.status(201).json({ success: true, runners: createdOrLinked });
});

// List runners for a specific race
app.get('/races/:raceId/runners', async (req, res) => {
  const { raceId } = req.params;
  try {
    const race = await prisma.race.findUnique({
      where: { id: raceId },
      include: { runners: true },
    });
    res.json(race ? race.runners : []);
  } catch (err) {
    res.status(500).json({ error: 'Kunne ikke hente løpere' });
  }
});

// Get the authenticated user's top 10 selection
app.get('/selections/me', isAuthenticated, async (req, res) => {
  try {
    const selections = await prisma.selection.findMany({
      where: { userId: req.user.id },
      include: { runner: true },
      orderBy: { rank: 'asc' },
    });
    res.json(selections);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch selections' });
  }
});


// Get the authenticated user's top 10 selection for a race
app.get('/races/:raceId/selections/me', isAuthenticated, async (req, res) => {
  const { raceId } = req.params;
  try {
    const selections = await prisma.selection.findMany({
      where: { userId: req.user.id, raceId },
      include: { runner: true },
      orderBy: { rank: 'asc' },
    });
    res.json(selections);
  } catch (err) {
    res.status(500).json({ error: 'Kunne ikke hente topp 10' });
  }
});

// Submit/update the authenticated user's top 10 selection for a race
app.post('/races/:raceId/selections', isAuthenticated, async (req, res) => {
  const { raceId } = req.params;
  const { runnerIds } = req.body;
  if (!Array.isArray(runnerIds) || runnerIds.length !== 10) {
    return res.status(400).json({ error: 'runnerIds må være en array med 10 løper-IDer' });
  }
  try {
    await prisma.selection.deleteMany({ where: { userId: req.user.id, raceId } });
    const data = runnerIds.map((runnerId, idx) => ({
      userId: req.user.id,
      raceId,
      runnerId,
      rank: idx + 1,
    }));
    await prisma.selection.createMany({ data });
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Kunne ikke sende inn topp 10' });
  }
});

// Set or update nickname for the authenticated user
app.post('/me/nickname', isAuthenticated, async (req, res) => {
  const { nickname } = req.body;
  if (typeof nickname !== 'string' || nickname.length < 2 || nickname.length > 32) {
    return res.status(400).json({ error: 'Ugyldig kallenavn (2-32 tegn)' });
  }
  try {
    await prisma.user.update({ where: { id: req.user.id }, data: { nickname } });
    res.json({ success: true, nickname });
  } catch (err) {
    res.status(500).json({ error: 'Kunne ikke oppdatere kallenavn' });
  }
});

// Leaderboard: show all users' top 10 selections (nickname if set, else name, else 'Anonym')
app.get('/leaderboard', isAuthenticated, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        selections: {
          include: { runner: true },
          orderBy: { rank: 'asc' },
        },
      },
    });
    const leaderboard = users.map(user => ({
      user: user.nickname || user.name || 'Anonym',
      selections: user.selections.map(sel => ({
        rank: sel.rank,
        runner: sel.runner ? {
          firstname: sel.runner.firstname,
          lastname: sel.runner.lastname,
          gender: sel.runner.gender,
          distance: sel.runner.distance,
          category: sel.runner.category,
        } : null
      }))
    }));
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: 'Kunne ikke hente leaderboard' });
  }
});

// Create a new race (admin use)
app.post('/races', async (req, res) => {
  const { name, date, status } = req.body;
  if (!name || !date || !status) {
    return res.status(400).json({ error: 'Navn, dato og status er påkrevd' });
  }
  try {
    const race = await prisma.race.create({
      data: {
        name,
        date: new Date(date),
        status,
      },
    });
    res.status(201).json(race);
  } catch (err) {
    console.error('Error creating race:', err);
    res.status(500).json({ error: 'Kunne ikke opprette løp' });
  }
});

// List all races
app.get('/races', async (req, res) => {
  try {
    const races = await prisma.race.findMany({ orderBy: { date: 'desc' } });
    res.json(races);
  } catch (err) {
    res.status(500).json({ error: 'Kunne ikke hente løp' });
  }
});

// Set official result for a race (admin use)
app.post('/races/:raceId/official-result', async (req, res) => {
  const { raceId } = req.params;
  const { top10 } = req.body;
  if (!Array.isArray(top10) || top10.length !== 10) {
    return res.status(400).json({ error: 'top10 må være en array med 10 løper-IDer' });
  }
  try {
    const result = await prisma.officialResult.upsert({
      where: { raceId },
      update: { top10 },
      create: { raceId, top10 },
    });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: 'Kunne ikke lagre resultat' });
  }
});

// Get official result for a race
app.get('/races/:raceId/official-result', async (req, res) => {
  const { raceId } = req.params;
  try {
    const result = await prisma.officialResult.findUnique({ where: { raceId } });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Kunne ikke hente resultat' });
  }
});

// Claim a runner
app.post('/runners/:id/claim', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userEmail = req.user.email;
  try {
    const runner = await prisma.runner.findUnique({ where: { id } });
    if (!runner) return res.status(404).json({ error: 'Runner not found' });
    if (runner.claimedByUserId) return res.status(400).json({ error: 'Runner already claimed' });
    // Only allow one claimed runner per user (unless admin)
    if (userEmail !== 'eplehans@gmail.com') {
      const alreadyClaimed = await prisma.runner.findFirst({ where: { claimedByUserId: userId } });
      if (alreadyClaimed) return res.status(400).json({ error: 'You have already claimed a runner' });
    }
    const updated = await prisma.runner.update({ where: { id }, data: { claimedByUserId: userId } });
    res.json({ success: true, runner: updated });
  } catch (err) {
    res.status(500).json({ error: 'Could not claim runner' });
  }
});

// Update runner metadata (only claimer or admin)
app.patch('/runners/:id', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userEmail = req.user.email;
  const allowedFields = ['instagram', 'strava', 'duv', 'utmb', 'itra', 'neda', 'firstname', 'lastname', 'gender', 'distance', 'category'];
  const data = {};
  for (const key of allowedFields) {
    if (key in req.body) data[key] = req.body[key];
  }
  try {
    const runner = await prisma.runner.findUnique({ where: { id } });
    if (!runner) return res.status(404).json({ error: 'Runner not found' });
    if (runner.claimedByUserId && runner.claimedByUserId !== userId && userEmail !== 'eplehans@gmail.com') {
      return res.status(403).json({ error: 'Only the claimer or admin can edit this runner' });
    }
    const updated = await prisma.runner.update({ where: { id }, data });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Kunne ikke oppdatere løper' });
  }
});

// Get a single race by ID
app.get('/races/:raceId', async (req, res) => {
  const { raceId } = req.params;
  try {
    const race = await prisma.race.findUnique({ where: { id: raceId } });
    if (!race) return res.status(404).json({ error: 'Race not found' });
    res.json(race);
  } catch (err) {
    res.status(500).json({ error: 'Kunne ikke hente løp' });
  }
});

// Update a race by ID (admin only)
app.patch('/races/:raceId', isAuthenticated, isAdmin, async (req, res) => {
  const { raceId } = req.params;
  const { name, date, status } = req.body;
  if (!name || !date || !status) {
    return res.status(400).json({ error: 'Navn, dato og status er påkrevd' });
  }
  try {
    const updated = await prisma.race.update({
      where: { id: raceId },
      data: {
        name,
        date: new Date(date),
        status,
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Kunne ikke oppdatere løp' });
  }
});

// Unclaim a runner
app.post('/runners/:id/unclaim', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userEmail = req.user.email;
  try {
    const runner = await prisma.runner.findUnique({ where: { id } });
    if (!runner) return res.status(404).json({ error: 'Runner not found' });
    if (runner.claimedByUserId !== userId && userEmail !== 'eplehans@gmail.com') {
      return res.status(403).json({ error: 'Only the claimer or admin can unclaim this runner' });
    }
    const updated = await prisma.runner.update({ where: { id }, data: { claimedByUserId: null } });
    res.json({ success: true, runner: updated });
  } catch (err) {
    res.status(500).json({ error: 'Could not unclaim runner' });
  }
});

// Upload profile picture for a runner
app.post('/runners/:id/profile-picture', isAuthenticated, upload.single('profilePicture'), async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userEmail = req.user.email;
  try {
    const runner = await prisma.runner.findUnique({ where: { id } });
    if (!runner) return res.status(404).json({ error: 'Runner not found' });
    if (runner.claimedByUserId !== userId && userEmail !== 'eplehans@gmail.com') {
      return res.status(403).json({ error: 'Only the claimer or admin can upload a profile picture' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // Optionally delete old picture
    if (runner.profilePicture) {
      const oldPath = path.join(uploadDir, runner.profilePicture);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    const updated = await prisma.runner.update({
      where: { id },
      data: { profilePicture: req.file.filename },
    });
    res.json({ success: true, runner: updated, url: `/uploads/${req.file.filename}` });
  } catch (err) {
    res.status(500).json({ error: 'Could not upload profile picture' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 