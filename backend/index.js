console.log('Backend index.js starting...');
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
const stringSimilarity = require('string-similarity');

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
  console.log('[deserializeUser] Called with id:', id);
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    console.log('[deserializeUser] Found user:', user);
    done(null, user);
  } catch (err) {
    console.error('[deserializeUser] Error:', err);
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

// Global leaderboard: all users, total points, and per-race breakdown
app.get('/leaderboard', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        selections: {
          include: { runner: true },
          orderBy: { rank: 'asc' },
        },
      },
    });
    const races = await prisma.race.findMany();
    const results = await prisma.officialResult.findMany();

    // Map raceId to official top10
    const resultMap = {};
    results.forEach(r => { resultMap[r.raceId] = r.top10; });

    // Calculate points per user per race
    const leaderboard = users.map(user => {
      const raceScores = {};
      let total = 0;
      races.forEach(race => {
        const selections = user.selections.filter(sel => sel.raceId === race.id);
        const official = resultMap[race.id];
        let points = 0;
        if (official && selections.length === 10) {
          points = selections.reduce((sum, sel, idx) => sum + (sel.runner && sel.runner.id === official[idx] ? 1 : 0), 0);
        }
        raceScores[race.id] = { race, points };
        total += points;
      });
      return {
        user: { id: user.id, nickname: user.nickname, name: user.name, email: user.email },
        total,
        raceScores,
      };
    });

    leaderboard.sort((a, b) => b.total - a.total);
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch leaderboard' });
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
      // Name similarity check
      const userName = req.user.name || req.user.nickname || '';
      const runnerName = `${runner.firstname} ${runner.lastname}`;
      const similarity = stringSimilarity(userName, runnerName);
      if (similarity < 0.5) {
        return res.status(400).json({ error: 'Runner name must be similar to your logged-in name to claim.' });
      }
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
    // Also update the user's profile picture
    await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: req.file.filename },
    });
    res.json({ success: true, runner: updated, url: `/uploads/${req.file.filename}` });
  } catch (err) {
    res.status(500).json({ error: 'Could not upload profile picture' });
  }
});

// Get leaderboard for a specific race
app.get('/races/:raceId/leaderboard', async (req, res) => {
  const { raceId } = req.params;
  try {
    // Get all selections for this race, including user and runner info
    const selections = await prisma.selection.findMany({
      where: { raceId },
      include: { user: true, runner: true },
      orderBy: [{ userId: 'asc' }, { rank: 'asc' }],
    });

    // Get official result for this race
    const official = await prisma.officialResult.findUnique({ where: { raceId } });
    if (!official) return res.json([]); // No results yet

    // Calculate points for each user
    const userMap = {};
    selections.forEach(sel => {
      if (!userMap[sel.userId]) {
        userMap[sel.userId] = { user: sel.user, predictions: [], points: 0 };
      }
      userMap[sel.userId].predictions[sel.rank - 1] = sel.runner;
    });

    // Simple scoring: +1 point for each correct runner in correct position
    Object.values(userMap).forEach(entry => {
      if (!official.top10) return;
      entry.points = entry.predictions.reduce((sum, runner, idx) => {
        return sum + (runner && runner.id === official.top10[idx] ? 1 : 0);
      }, 0);
    });

    // Return sorted leaderboard
    const leaderboard = Object.values(userMap).sort((a, b) => b.points - a.points);
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch race leaderboard' });
  }
});

// Get runners for a specific race
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

// Serve index.html for all non-API, non-static routes
if (process.env.NODE_ENV === 'production') {
  // app.get('*', (req, res) => {
  //   if (
  //     !req.path.startsWith('/api') &&
  //     !req.path.startsWith('/uploads') &&
  //     !req.path.startsWith('/auth') &&
  //     !req.path.startsWith('/runners') &&
  //     !req.path.startsWith('/selections') &&
  //     !req.path.startsWith('/me') &&
  //     !req.path.startsWith('/leaderboard')
  //   ) {
  //     res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  //   }
  // });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (app._router) {
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        console.log('Route:', middleware.route.path);
      } else if (middleware.name === 'router') {
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) {
            console.log('Route:', handler.route.path);
          }
        });
      }
    });
  }
}); 