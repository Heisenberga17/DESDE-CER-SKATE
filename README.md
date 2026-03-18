# CASA 24 - Skate

A 3D skateboarding game. Ride a skateboard, hit ramps, grind rails, and pull off tricks in a neon-lit skatepark.

---

## How to Run the Game (Step by Step)

### Step 1: Install Node.js

Node.js is a program that lets you run the game on your computer. You only need to do this once.

1. Go to https://nodejs.org/
2. Click the big green button that says **"LTS"** (the recommended version)
3. Open the downloaded file and follow the installer — just click "Next" / "Continue" through everything, use all the default options
4. **Restart your computer** after installing (not always required, but avoids issues)

To verify it worked, open your **Terminal** (Mac) or **Command Prompt** (Windows):
- **Mac**: Press `Cmd + Space`, type `Terminal`, press Enter
- **Windows**: Press the Windows key, type `cmd`, press Enter

Then type this and press Enter:
```
node --version
```
You should see a version number like `v20.11.0` or similar. If you see an error, try restarting your computer and opening Terminal again.

### Step 2: Download the Game

If you received the project as a `.zip` file:
1. Unzip the file (double-click it on Mac, or right-click > "Extract All" on Windows)
2. You should now have a folder called `Skate`

If you're cloning from GitHub:
```
git clone <repo-url>
```
(Replace `<repo-url>` with the actual URL you were given)

### Step 3: Open a Terminal Inside the Game Folder

**Mac:**
1. Open **Terminal** (Cmd + Space, type "Terminal", press Enter)
2. Type `cd ` (with a space after it), then **drag the Skate folder** from Finder into the Terminal window. It will paste the folder path for you.
3. Press Enter

**Windows:**
1. Open the `Skate` folder in File Explorer
2. Click the address bar at the top of the window (where it shows the folder path)
3. Type `cmd` and press Enter. A Command Prompt window will open already in the right folder.

### Step 4: Install the Game's Dependencies

In your Terminal / Command Prompt (which should now be inside the Skate folder), type:

```
npm install
```

Press Enter and wait. You'll see it downloading files — this can take 30 seconds to a couple of minutes. When it's done, you'll see your cursor ready for a new command again.

If you see warnings (yellow text) that's normal. Only red text with "ERR!" means something went wrong.

### Step 5: Start the Game

In the same Terminal / Command Prompt, type:

```
npm run dev
```

Press Enter. You'll see something like:

```
  VITE v8.x.x  ready in 300 ms

  ➜  Local:   http://localhost:5173/
```

### Step 6: Play!

1. Open your web browser (Chrome or Edge recommended)
2. Go to **http://localhost:5173**
3. The game should load and you'll see a skater on a skateboard

### Step 7: Stop the Game

When you're done playing, go back to the Terminal / Command Prompt and press `Ctrl + C` to stop the server. You can close the Terminal window after that.

To play again later, just repeat Steps 3, 5, and 6 (you don't need to install anything again).

---

## Controls

### Keyboard

| Key | What it does |
|-----|-------------|
| `W` | Push forward (accelerate) |
| `S` | Brake / slow down |
| `A` | Steer left |
| `D` | Steer right |
| `Space` | Ollie (jump) |
| `F` | Kickflip (press while in the air) |
| `G` | Heelflip (press while in the air) |
| `H` | Shuvit (press while in the air) |
| `E` | Grind (press when near a rail) |
| `R` | Reset back to start |

**Tips:**
- Hold `W` to build speed, then press `Space` to jump
- While in the air, press `F`, `G`, or `H` to do tricks
- Ride toward a rail and press `E` to lock onto it and grind
- Press `Space` to jump off a rail

### PS5 / PlayStation Controller

Plug in your controller **before** opening the game (or refresh the page after plugging it in).

| Input | What it does |
|-------|-------------|
| Left Stick | Steer |
| X (Cross) | Push forward |
| Left Stick Down | Brake |
| Right Stick Flick Up | Ollie (jump) |
| Right Stick Flick Up-Left | Kickflip |
| Right Stick Flick Up-Right | Heelflip |
| Right Stick Flick Left/Right | Shuvit |
| R1 | Grind |
| Triangle | Shuvit |
| Square | Kickflip |
| Circle | Heelflip |
| Options | Reset |

---

## Troubleshooting

**"command not found: node" or "node is not recognized"**
Node.js isn't installed yet, or your computer needs a restart after installing it. Go back to Step 1.

**"command not found: npm"**
Same as above — npm comes bundled with Node.js.

**npm install shows red errors**
Make sure your Terminal is inside the Skate folder (Step 3). You can check by typing `ls` (Mac) or `dir` (Windows) — you should see files like `package.json` and `index.html` in the list.

**Blank screen when opening the game**
Press `F12` in your browser to open Developer Tools, then click the "Console" tab. Look for red error messages — they usually say what went wrong.

**Game is slow / choppy**
- Use Chrome or Edge (not Safari or Firefox)
- Make sure hardware acceleration is on: in Chrome, go to `chrome://settings/system` and turn on "Use graphics acceleration when available"
- Close other heavy tabs or apps

**Controller not working**
- Connect it before opening the page, or refresh after connecting
- Try a wired USB connection if Bluetooth isn't working
- Chrome has the best controller support
