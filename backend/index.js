require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const { PrismaClient } = require('./generated/prisma');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

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

// Get all runners
app.get('/runners', async (req, res) => {
  try {
    const runners = await prisma.runner.findMany();
    res.json(runners);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch runners' });
  }
});

// Add a new runner or multiple runners (admin use, but for now just require auth)
app.post('/runners', isAuthenticated, async (req, res) => {
  let runners = req.body;
  if (!Array.isArray(runners)) {
    runners = [runners];
  }
  // Validate and transform each runner
  const toCreate = [];
  for (const r of runners) {
    if (!r.firstname || !r.lastname || !r.gender || !r.distance || !r.category) {
      return res.status(400).json({ error: 'Missing required fields in one or more runners' });
    }
    toCreate.push({
      firstname: r.firstname,
      lastname: r.lastname,
      gender: r.gender,
      distance: r.distance.toString(),
      category: r.category,
    });
  }
  try {
    const created = await prisma.runner.createMany({ data: toCreate });
    res.status(201).json({ success: true, count: created.count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create runners' });
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

// Submit/update the authenticated user's top 10 selection
app.post('/selections', isAuthenticated, async (req, res) => {
  const { runnerIds } = req.body; // expects array of 10 runner IDs in order of rank
  if (!Array.isArray(runnerIds) || runnerIds.length !== 10) {
    return res.status(400).json({ error: 'runnerIds must be an array of 10 runner IDs' });
  }
  try {
    // Remove previous selections
    await prisma.selection.deleteMany({ where: { userId: req.user.id } });
    // Create new selections
    const data = runnerIds.map((runnerId, idx) => ({
      userId: req.user.id,
      runnerId,
      rank: idx + 1,
    }));
    const selections = await prisma.selection.createMany({ data });
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit selections' });
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 